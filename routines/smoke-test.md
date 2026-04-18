# Routine: Post-Deploy Smoke Test
# Trigger: API (called by Vercel deploy hook)
# Connectors: Slack, Vercel

## What to do

The deploy pipeline just triggered this routine. Run a quick health check 
against the production deployment and report results.

### Checks to perform

1. **Homepage loads**
   - Fetch the production URL
   - Verify HTTP 200 response
   - Check response time is under 3 seconds
   - Verify no JavaScript console errors in the response

2. **API health**
   - Hit /api/health (or the main API endpoint) and verify 200 response
   - Verify Supabase connection is working (the health endpoint should check this)

3. **Key pages**
   - Verify /login page loads
   - Verify any public-facing pages return 200

4. **Recent changes**
   - Check the latest deployment on Vercel for any build warnings
   - If the deploy was triggered by a PR that fixed a feedback item,
     test the specific fix if possible

### Reporting

**If ALL checks pass:**
- Post to #${PROJECT_NAME}-dev: "✅ Deploy verified — all smoke tests passed"
- Query the `feedback_items` table for any items with status='in_review' 
  where the github_pr_url matches the deployed PR
- Update their status to 'deployed' and set deployed_at to now()
- Post to #${PROJECT_NAME}-feedback: notify the original reporter that 
  their feedback has been addressed in the latest release

**If ANY check fails:**
- Post to #${PROJECT_NAME}-dev: "🔴 Deploy smoke test FAILED" with details
  of which checks failed and the error messages
- Include the Vercel deployment URL for quick debugging
- Do NOT update any feedback items to 'deployed'

### Context from trigger
The API trigger payload may include a `text` field with information about 
what was deployed (commit hash, PR number, etc.). Use this context to 
make the report more specific.
