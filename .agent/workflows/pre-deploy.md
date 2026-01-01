---
description: standardized pre-update verification process
---

# Pre-Push Verification Workflow

Before pushing to main, run through this checklist:

// turbo-all

1. Run tests:
   ```bash
   npm test
   ```

2. Build verification:
   ```bash
   npm run build
   ```

3. **README Check**: Ensure README.md reflects current features:
   - Scenario count is accurate
   - New features are documented
   - Removed features are cleaned up

4. Commit and push:
   ```bash
   git add -A && git commit -m "your message" && git push origin main
   ```

## Quick Command (All-in-One)
```bash
npm test && npm run build && echo "✅ README updated?" && git status
```
