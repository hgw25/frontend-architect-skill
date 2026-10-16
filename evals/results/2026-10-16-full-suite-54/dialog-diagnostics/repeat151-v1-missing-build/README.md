# Diagnostic setup failure — excluded from causal inference

This first diagnostic copy intentionally omitted generated dist files but initially ran npm run check without rebuilding the package. The submitted check begins typechecking a self-package consumer before rebuilding its declared export; this fails module resolution in a clean copy. The subsequent pointer probes also lacked the browser build and are invalid for event-order inference. All failed logs, traces (if any), inputs, patch and results remain preserved. The source model submission is untouched.

The corrected diagnostic in ../repeat151/ first runs the original package build, restoring the precondition present in the submitted/host workspace. No original production source or behavior assertion changes for its before replay. The clean-copy check-order limitation remains documented; it is not the cause of the original host outside-focus failure.
