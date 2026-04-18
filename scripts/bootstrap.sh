#!/bin/bash
set -euo pipefail

#=============================================================================
# PROJECT BOOTSTRAP SCRIPT
# Creates a full project with: GitHub repo, Supabase DB, Vercel deploy,
# Slack channels with Claude bot, and Claude Code routines.
#
# Usage: ./scripts/bootstrap.sh <project-name>
# Example: ./scripts/bootstrap.sh my-cool-app
#=============================================================================

PROJECT_NAME="${1:?Usage: ./scripts/bootstrap.sh <project-name>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$HOME/.project-bootstrap/config.env"
LOG_FILE="/tmp/bootstrap-${PROJECT_NAME}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; exit 1; }
step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}" | tee -a "$LOG_FILE"; }

echo "Bootstrap log: $LOG_FILE"
echo "Started: $(date)" > "$LOG_FILE"

#=============================================================================
# PHASE 0: Load config + validate prerequisites
#=============================================================================
step "Phase 0: Validating prerequisites"

if [ ! -f "$CONFIG_FILE" ]; then
  fail "Config file not found at $CONFIG_FILE
  
  Create it with:
    mkdir -p ~/.project-bootstrap
    cat > ~/.project-bootstrap/config.env << 'EOF'
GITHUB_ORG=your-github-username
SUPABASE_ORG_ID=your-supabase-org-id
VERCEL_TEAM=your-vercel-team-slug
DEFAULT_REGION=ap-southeast-2
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
EOF"
fi

source "$CONFIG_FILE"

# Validate required config vars
for var in GITHUB_ORG DEFAULT_REGION SLACK_BOT_TOKEN; do
  if [ -z "${!var:-}" ]; then
    fail "Missing $var in $CONFIG_FILE"
  fi
done

# Check CLI tools are installed and authenticated
for cmd in gh supabase vercel node npm; do
  if ! command -v "$cmd" &> /dev/null; then
    fail "$cmd is not installed. Install it first."
  fi
done

# Verify GitHub auth
if ! gh auth status &> /dev/null; then
  fail "GitHub CLI not authenticated. Run: gh auth login"
fi

# Verify Supabase auth
if ! supabase projects list &> /dev/null 2>&1; then
  warn "Supabase CLI may not be authenticated. Run: supabase login"
fi

log "All prerequisites validated"
log "Project name: $PROJECT_NAME"
log "GitHub org: $GITHUB_ORG"
log "Region: $DEFAULT_REGION"

#=============================================================================
# PHASE 1: Create GitHub repository from template
#=============================================================================
step "Phase 1: Creating GitHub repository"

REPO_URL="https://github.com/${GITHUB_ORG}/${PROJECT_NAME}"

if gh repo view "${GITHUB_ORG}/${PROJECT_NAME}" &> /dev/null 2>&1; then
  warn "Repo ${GITHUB_ORG}/${PROJECT_NAME} already exists. Skipping creation."
else
  # Check if template repo exists
  TEMPLATE_REPO="${GITHUB_ORG}/project-bootstrap-template"
  if gh repo view "$TEMPLATE_REPO" &> /dev/null 2>&1; then
    gh repo create "${GITHUB_ORG}/${PROJECT_NAME}" \
      --template "$TEMPLATE_REPO" \
      --public \
      --clone
    log "Created repo from template: $REPO_URL"
  else
    # Fallback: create empty repo and copy files
    gh repo create "${GITHUB_ORG}/${PROJECT_NAME}" \
      --public \
      --clone \
      --description "Auto-bootstrapped project with feedback loop"
    
    # Copy template files into the new repo
    cp -r "$ROOT_DIR"/{src,supabase,routines,.claude,scripts} "./${PROJECT_NAME}/" 2>/dev/null || true
    cp "$ROOT_DIR"/{package.json,.env.example,.gitignore,vercel.json,CLAUDE.md,README.md} "./${PROJECT_NAME}/" 2>/dev/null || true
    
    log "Created repo and copied template files: $REPO_URL"
  fi
fi

cd "${PROJECT_NAME}" 2>/dev/null || cd "."

#=============================================================================
# PHASE 2: Provision Supabase project
#=============================================================================
step "Phase 2: Provisioning Supabase"

# Create Supabase project
SUPABASE_PROJECT_REF=""

if supabase projects list 2>/dev/null | grep -q "$PROJECT_NAME"; then
  warn "Supabase project '$PROJECT_NAME' may already exist. Attempting to link."
  SUPABASE_PROJECT_REF=$(supabase projects list 2>/dev/null | grep "$PROJECT_NAME" | awk '{print $1}' || echo "")
else
  log "Creating Supabase project: $PROJECT_NAME"
  
  # Generate a secure database password
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
  
  SUPABASE_OUTPUT=$(supabase projects create "$PROJECT_NAME" \
    --db-password "$DB_PASSWORD" \
    --region "$DEFAULT_REGION" \
    --org-id "${SUPABASE_ORG_ID:-}" 2>&1) || warn "Supabase project creation returned non-zero. Check manually."
  
  log "Supabase project created. Waiting 30s for provisioning..."
  sleep 30
  
  SUPABASE_PROJECT_REF=$(supabase projects list 2>/dev/null | grep "$PROJECT_NAME" | awk '{print $1}' || echo "")
fi

if [ -n "$SUPABASE_PROJECT_REF" ]; then
  # Link and get API keys
  supabase link --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null || true
  
  # Extract keys
  SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
  SUPABASE_ANON_KEY=$(supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null | grep "anon" | awk '{print $NF}' || echo "PENDING")
  SUPABASE_SERVICE_KEY=$(supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null | grep "service_role" | awk '{print $NF}' || echo "PENDING")
  
  log "Supabase URL: $SUPABASE_URL"
  
  # Run migrations
  if [ -d "supabase/migrations" ]; then
    log "Running database migrations..."
    supabase db push 2>/dev/null || warn "Migration push failed. Run manually: supabase db push"
  fi
else
  warn "Could not determine Supabase project ref. Set up manually."
  SUPABASE_URL="PENDING"
  SUPABASE_ANON_KEY="PENDING"
  SUPABASE_SERVICE_KEY="PENDING"
fi

#=============================================================================
# PHASE 3: Link Vercel project
#=============================================================================
step "Phase 3: Setting up Vercel"

# Link or create Vercel project
if [ -f ".vercel/project.json" ]; then
  warn "Vercel already linked. Skipping."
else
  vercel link --yes 2>/dev/null || vercel 2>/dev/null || warn "Vercel link failed. Run manually: vercel link"
fi

# Set environment variables
log "Setting Vercel environment variables..."

set_vercel_env() {
  local key=$1
  local value=$2
  local env=${3:-production}
  
  if [ "$value" != "PENDING" ] && [ -n "$value" ]; then
    echo "$value" | vercel env add "$key" "$env" --force 2>/dev/null || \
      warn "Failed to set $key. Set manually: vercel env add $key $env"
  else
    warn "$key is PENDING. Set manually once available."
  fi
}

set_vercel_env "SUPABASE_URL" "${SUPABASE_URL:-PENDING}"
set_vercel_env "SUPABASE_ANON_KEY" "${SUPABASE_ANON_KEY:-PENDING}"
set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "${SUPABASE_URL:-PENDING}"
set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${SUPABASE_ANON_KEY:-PENDING}"

log "Vercel environment configured"

#=============================================================================
# PHASE 4: Create Slack channels
#=============================================================================
step "Phase 4: Setting up Slack channels"

SLACK_API="https://slack.com/api"
FEEDBACK_CHANNEL="${PROJECT_NAME}-feedback"
DEV_CHANNEL="${PROJECT_NAME}-dev"

create_slack_channel() {
  local channel_name=$1
  local purpose=$2
  
  RESPONSE=$(curl -s -X POST "$SLACK_API/conversations.create" \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$channel_name\", \"is_private\": false}")
  
  CHANNEL_ID=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('ok'):
    print(data['channel']['id'])
elif 'name_taken' in data.get('error', ''):
    print('EXISTS')
else:
    print('ERROR: ' + data.get('error', 'unknown'))
" 2>/dev/null || echo "ERROR")
  
  if [ "$CHANNEL_ID" = "EXISTS" ]; then
    warn "Channel #$channel_name already exists"
    # Look up existing channel ID
    CHANNEL_ID=$(curl -s -X GET "$SLACK_API/conversations.list?limit=200" \
      -H "Authorization: Bearer $SLACK_BOT_TOKEN" | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
for ch in data.get('channels', []):
    if ch['name'] == '$channel_name':
        print(ch['id'])
        break
" 2>/dev/null || echo "")
  elif [[ "$CHANNEL_ID" == ERROR* ]]; then
    warn "Failed to create #$channel_name: $CHANNEL_ID"
    return
  else
    log "Created #$channel_name ($CHANNEL_ID)"
  fi
  
  # Set channel topic/purpose
  if [ -n "$CHANNEL_ID" ] && [ "$CHANNEL_ID" != "ERROR" ]; then
    curl -s -X POST "$SLACK_API/conversations.setPurpose" \
      -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"channel\": \"$CHANNEL_ID\", \"purpose\": \"$purpose\"}" > /dev/null 2>&1
    
    # Post welcome message
    curl -s -X POST "$SLACK_API/chat.postMessage" \
      -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"channel\": \"$CHANNEL_ID\",
        \"text\": \"This channel is ready for $PROJECT_NAME. Type /invite @Claude to add Claude to this channel.\"
      }" > /dev/null 2>&1
  fi
  
  echo "$CHANNEL_ID"
}

FEEDBACK_CH_ID=$(create_slack_channel "$FEEDBACK_CHANNEL" "User feedback, bug reports, and feature requests for $PROJECT_NAME")
DEV_CH_ID=$(create_slack_channel "$DEV_CHANNEL" "Internal dev channel: triaged requirements and build updates for $PROJECT_NAME")

log "Slack channels created. IMPORTANT: Run /invite @Claude in both channels!"

#=============================================================================
# PHASE 5: Create local env file
#=============================================================================
step "Phase 5: Creating local environment file"

cat > .env.local << ENVEOF
# Auto-generated by bootstrap.sh on $(date)
# Project: $PROJECT_NAME

# Supabase
SUPABASE_URL=${SUPABASE_URL:-PENDING}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-PENDING}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY:-PENDING}
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL:-PENDING}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-PENDING}

# Slack
SLACK_FEEDBACK_CHANNEL=${FEEDBACK_CHANNEL}
SLACK_DEV_CHANNEL=${DEV_CHANNEL}
SLACK_FEEDBACK_CHANNEL_ID=${FEEDBACK_CH_ID:-PENDING}
SLACK_DEV_CHANNEL_ID=${DEV_CH_ID:-PENDING}

# Project
PROJECT_NAME=${PROJECT_NAME}
ENVEOF

log "Created .env.local"

#=============================================================================
# PHASE 6: Update CLAUDE.md with project-specific context
#=============================================================================
step "Phase 6: Configuring Claude Code context"

# macOS sed requires -i '' while GNU sed uses -i alone
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\${PROJECT_NAME}/${PROJECT_NAME}/g" CLAUDE.md 2>/dev/null || true
  sed -i '' "s/\${PROJECT_NAME}/${PROJECT_NAME}/g" routines/*.md 2>/dev/null || true
else
  sed -i "s/\${PROJECT_NAME}/${PROJECT_NAME}/g" CLAUDE.md 2>/dev/null || true
  sed -i "s/\${PROJECT_NAME}/${PROJECT_NAME}/g" routines/*.md 2>/dev/null || true
fi

log "Updated CLAUDE.md and routine prompts"

#=============================================================================
# PHASE 7: Install dependencies and initial commit
#=============================================================================
step "Phase 7: Installing dependencies"

if [ -f "package.json" ]; then
  npm install 2>/dev/null || warn "npm install failed. Run manually."
  log "Dependencies installed"
fi

# Commit everything
git add -A 2>/dev/null || true
git commit -m "chore: bootstrap $PROJECT_NAME with feedback loop infrastructure" 2>/dev/null || true
git push origin main 2>/dev/null || git push 2>/dev/null || warn "Push failed. Push manually."

log "Initial commit pushed"

#=============================================================================
# SUMMARY
#=============================================================================
step "Bootstrap Complete!"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  GitHub:    $REPO_URL"
echo "  Supabase:  ${SUPABASE_URL:-PENDING}"
echo "  Vercel:    Run 'vercel --prod' to deploy"
echo "  Slack:     #$FEEDBACK_CHANNEL + #$DEV_CHANNEL"
echo ""
echo -e "${YELLOW}  MANUAL STEPS REMAINING:${NC}"
echo "  1. Run /invite @Claude in both Slack channels"
echo "  2. Go to claude.ai/code/routines and create 3 routines"
echo "     using the prompts in the routines/ folder"
echo "  3. Copy the smoke-test routine's API endpoint into"
echo "     Vercel env vars (SMOKE_TEST_URL + SMOKE_TEST_TOKEN)"
echo "  4. Run 'vercel --prod' for first deployment"
echo ""
echo "  Full log: $LOG_FILE"
echo ""
