# Routine: PR Auto-Review
# Trigger: GitHub — pull_request.opened, pull_request.synchronize
# Connectors: GitHub

## What to do

Review this pull request against the project's coding standards and post 
inline comments on specific lines where issues are found.

### Review checklist

1. **Security**
   - No hardcoded secrets, API keys, or tokens in the diff
   - No SQL injection vulnerabilities (all Supabase queries use parameterized inputs)
   - No XSS vectors in rendered content
   - Supabase RLS policies are not bypassed
   - service_role key is never exposed to client-side code

2. **Error handling**
   - All async operations have try-catch or .catch()
   - API routes return appropriate error status codes
   - User-facing errors show helpful messages, not stack traces
   - Network failures are handled gracefully

3. **Code quality**
   - TypeScript types are used (no `any` unless justified)
   - No unused imports or variables
   - Functions are reasonably sized (flag anything over 50 lines)
   - Naming is clear and consistent

4. **Database**
   - New tables or columns have appropriate indexes
   - Migrations are backwards-compatible
   - RLS policies are applied to new tables
   - No N+1 query patterns

5. **Tests**
   - New features have corresponding tests
   - Bug fixes include a regression test
   - Flag missing test coverage but don't block the PR

### How to respond

- Post inline comments on specific lines with the issue and a suggested fix
- Rate each issue: 🔴 blocking, 🟡 should fix, 🟢 suggestion
- At the end, post a summary comment:
  - If all clear: approve the PR with a brief summary
  - If blocking issues: request changes with the list of 🔴 items
  - If only suggestions: approve but note the 🟡 and 🟢 items

### Do NOT
- Rewrite entire files or suggest complete refactors
- Block PRs for style-only issues
- Comment on code that wasn't changed in the diff
