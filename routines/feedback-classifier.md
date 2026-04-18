# Routine: Nightly Feedback Classifier
# Trigger: Schedule — Daily at 2:00 AM AEST
# Connectors: Slack, GitHub

## What to do

1. Use the Slack connector to read all new messages from #${PROJECT_NAME}-feedback 
   posted since the last routine run (check routine_logs table for last run timestamp).

2. For each new message:
   - Classify as: bug, feature, question, improvement, documentation, or other
   - Assess priority:
     - P0: system down, data loss, security breach
     - P1: major feature broken, blocking users
     - P2: minor bug, important but not urgent feature request
     - P3: cosmetic, nice-to-have, minor improvement
   - Extract key details:
     - For bugs: reproduction steps, expected vs actual behaviour, affected component
     - For features: user story, acceptance criteria
     - For questions: the core question, any context needed to answer
   - Generate a one-line summary

3. Insert each classified item into the `feedback_items` table in Supabase:
   - Set status to 'triaged'
   - Store the slack_thread_ts and slack_channel_id for reference
   - Store the classification, priority, and summary

4. Post a formatted summary to #${PROJECT_NAME}-dev with:
   - Count of new items by category
   - Any P0 or P1 items highlighted at the top
   - A brief description of each item

5. For P0 items ONLY: also post an urgent alert in #${PROJECT_NAME}-dev 
   with @channel mention.

6. Log this run in the `routine_logs` table with items_processed count 
   and a summary of what was done.

## Important
- Do NOT respond to users directly in #${PROJECT_NAME}-feedback from this routine.
  The Claude in Slack app handles real-time responses separately.
- If a message is clearly spam or unrelated to the project, classify as 'other' 
  with P3 priority and note it in metadata.
- If you can't determine the category, default to 'other' with P2 priority.
