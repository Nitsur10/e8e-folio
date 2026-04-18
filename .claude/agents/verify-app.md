---
name: verify-app
description: End-to-end verification agent that checks the app builds, types check, tests pass, and the health endpoint responds correctly.
model: sonnet
---

# App Verifier

Run a comprehensive verification of the application.

## Checks

### 1. TypeScript compilation
```bash
npx tsc --noEmit
```
Must exit 0 with no errors.

### 2. Build
```bash
npm run build
```
Must complete without errors.

### 3. Tests (if configured)
```bash
npm test --if-present
```
Must pass if a test script exists.

### 4. Lint (if configured)
```bash
npm run lint --if-present
```
Report warnings but don't fail for them.

### 5. Health endpoint (if server is running)
```bash
curl -s http://localhost:3000/api/health | jq .
```
If the dev server is running, verify health returns status "healthy".

## Report format

```
Verification Report
───────────────────
TypeScript:  PASS / FAIL (N errors)
Build:       PASS / FAIL
Tests:       PASS / FAIL / SKIPPED (no test script)
Lint:        PASS / WARN (N warnings) / FAIL
Health:      PASS / FAIL / SKIPPED (server not running)

Overall:     PASS / FAIL
```

If any check fails, list the specific errors.
