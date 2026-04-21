#!/usr/bin/env bash
#
# Fails if feature code contains hardcoded hex color values.
# Tokens are allowed in shared/design-tokens and globals.css only.
#
# Enforces HANDOFF_03 rule: no hardcoded hex values in any feature code.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Paths where hex is legitimate (the source of truth).
ALLOW=(
  "shared/src/design-tokens/index.ts"
  "web/app/globals.css"
  "mobile/app.json"
  "mobile/App.tsx"
  # FIXME(T5.3): FeedbackWidget is legacy bootstrap template UI. Rewrite with
  # design tokens when the Phase 1 onboarding UI lands and this can go.
  "web/components/FeedbackWidget.tsx"
)

BUILD_GREP_EXCLUDES=""
for p in "${ALLOW[@]}"; do
  BUILD_GREP_EXCLUDES+=" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.expo --exclude-dir=dist"
done

# Feature code: web/app, web/components, web/lib, web/features (future), mobile/app (future).
SEARCH_DIRS=(web/app web/components web/lib mobile/theme)

MATCHES=""
for d in "${SEARCH_DIRS[@]}"; do
  [ -d "$ROOT/$d" ] || continue
  while IFS= read -r file; do
    rel="${file#"$ROOT/"}"
    skip=false
    for a in "${ALLOW[@]}"; do
      if [[ "$rel" == "$a" ]]; then skip=true; break; fi
    done
    $skip && continue
    if grep -En '#[0-9a-fA-F]{3,8}\b' "$file" >/dev/null 2>&1; then
      MATCHES+=$'\n'"$(grep -En '#[0-9a-fA-F]{3,8}\b' "$file" | sed "s|^|$rel:|")"
    fi
  done < <(find "$ROOT/$d" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \))
done

if [ -n "$MATCHES" ]; then
  echo "Hardcoded hex colors found in feature code. Use @folio/shared/design-tokens instead:"
  echo "$MATCHES"
  exit 1
fi

echo "OK — no hardcoded hex colors in feature code."
