# /go — Verify, simplify, and ship

Run the full pre-ship pipeline for current changes.

## Steps

1. **Verify the build compiles**
   ```bash
   npx tsc --noEmit
   ```
   If this fails, fix the type errors before proceeding.

2. **Run tests** (if they exist)
   ```bash
   npm test --if-present
   ```
   If tests fail, fix them before proceeding.

3. **Simplify the code**
   Review all changed files (use `git diff --name-only`) for:
   - Unused imports or variables
   - Duplicated logic that can be extracted
   - Overly complex conditionals
   - Code that doesn't follow existing project patterns
   Fix any issues found.

4. **Verify the build still compiles** after simplification
   ```bash
   npx tsc --noEmit
   ```

5. **Commit, push, and open a PR**
   - Create a descriptive commit message using conventional commits
   - Push to origin on a feature branch (never main)
   - Open a PR with a clear summary of changes

Report the PR URL when done.
