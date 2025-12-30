---
description: standardized pre-update verification process
---

# Pre-Update Verification Workflow

Before deploying or submitting any major update, follow these steps to ensure the application is stable and performant.

## 1. Automated Logic Check
Run the unit test suite to verify math, scoring, and engine logic.
```bash
npm run test
```

## 2. Type Safety Check
Ensure there are no TypeScript regressions.
```bash
npm run build
```
> [!NOTE]
> `npm run build` runs `tsc` followed by the Vite build.

## 3. Visual & Performance Verification
Since automated tests cannot easily verify canvas rendering or "feel", perform the following manual checks:

### Countdown & Sync
- [ ] Select a scenario (e.g., Static Grid).
- [ ] Verify the 3-2-1 countdown is smooth.
- [ ] Verify targets only respond to clicks *after* the switch "Playing".

### Path Responsiveness
- [ ] Select "Strafing Click".
- [ ] Verify the guiding lines follow moving targets tightly (80% responsiveness).

### HUD & Scoring
- [ ] Play "Smooth Track".
- [ ] Confirm HUD displays "Track %" and updates live while on target.
- [ ] Confirm final results screen matches HUD stats.

## 4. Total Verification
Run the unified command to check everything at once:
```bash
npm run check-all
```
