# TODO — Fix BS count not displayed in Activité 2

## Problem
The BS (bien support) count doesn't show until the user clicks on a VM. This is because biens supports are loaded lazily (only on expand).

## Steps
- [x] Analyze root cause (lazy loading of biens supports in Activite2View)
- [x] Confirm plan with user
- [x] Modify `loadValeurs()` in `frontend/src/components/atelier1/Activite2View.tsx` to preload all biens supports in parallel
- [x] Update `handleToggleExpand` to use preloaded data
- [x] Apply same preload fix to `frontend/src/components/atelier1/Activite2Table.tsx` for consistency
- [x] Verify no regressions — `tsc --noEmit` confirms no new type errors introduced by the change (only pre-existing errors in other files remain)

