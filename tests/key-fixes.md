# Key Fixes Registry

> Critical bugs that have been fixed and must never regress.
> Each entry has a corresponding automated test.

| Fix ID | Commit | Date | Description | Test File | Status |
|--------|--------|------|-------------|-----------|--------|
| KF-001 | `e940e1f` | - | Targets scale correctly on window resize | `resolution.spec.ts` | ✅ Tested |
| KF-002 | `ddd7f2a` | - | Adaptive tracking doesn't get stuck horizontally | `tracking.spec.ts` | ✅ Tested |
| KF-003 | `f88c4c2` | - | Crosshair color renders correctly | `visual.spec.ts` | ✅ Tested |

---

## How to Add New Entries

When you fix a bug:

1. **Document it here** with commit hash and description
2. **Write a regression test** that would fail if the bug returned
3. **Link the test file** in the registry
4. **Update status** to ✅ when test is passing

---

## Pattern: Fix → Document → Test → Never Regress

Each entry is a *captured regularity* — a bug pattern you've learned to detect and prevent.
