# /commit-push-pr — Ship current changes as a PR

Commit all staged and unstaged changes, push, and open a pull request.

## Steps

1. Run `git status` and `git diff` to understand all changes.

2. Draft a commit message:
   - Use conventional commit format (feat:, fix:, chore:, etc.)
   - Keep the first line under 72 characters
   - Add a body if the change needs explanation

3. Stage and commit the changes.

4. Push to origin. If on main, create a feature branch first:
   ```bash
   git checkout -b feat/<short-description>
   ```

5. Open a PR using `gh pr create` with:
   - A clear title (under 70 characters)
   - A body with summary and test plan

6. Report the PR URL.

## Rules
- NEVER push directly to main
- NEVER force push
- NEVER skip pre-commit hooks
