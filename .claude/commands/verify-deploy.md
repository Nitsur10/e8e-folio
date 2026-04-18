# /verify-deploy — Check production health

Verify the current production deployment is healthy.

## Steps

1. **Get the production URL** from Vercel:
   ```bash
   vercel ls --prod 2>/dev/null | head -5
   ```
   Or use the project's known production URL.

2. **Hit the health endpoint**:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{time_total}s" https://<prod-url>/api/health
   ```
   - Expect: HTTP 200, response time under 3 seconds

3. **Check the health response body**:
   ```bash
   curl -s https://<prod-url>/api/health | jq .
   ```
   - Verify `status: "healthy"`
   - Verify `checks.env: "ok"` and `checks.supabase: "ok"`

4. **Check the homepage loads**:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{time_total}s" https://<prod-url>/
   ```
   - Expect: HTTP 200

5. **Report results** in this format:
   ```
   Production Health Check
   ───────────────────────
   Health API:  200 OK (0.4s)
   Supabase:    connected
   Homepage:    200 OK (1.2s)
   Status:      HEALTHY
   ```

If any check fails, report the specific failure and suggest next steps.
