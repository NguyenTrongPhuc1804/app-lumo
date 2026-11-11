# Stitch Models Implementation Plan

Goal: Apply approved Stitch model screen, shared header/tab navigation, supplied logo, server descriptions and tiny typography without changing translation logic.
Spec: Approved conversation design on 2026-11-11 (six steps).
Architecture: Existing React Native appearance context and Express/Mongoose model CRUD. No new runtime dependencies.

## Global Constraints
- Preserve translation/OCR/native implementation and existing model CRUD/auth/key masking.
- description optional, maximum 500 characters, multiline and explicitly clearable; old records work.
- tiny scale 0.8; default auto/light unchanged; touch targets >=48dp.
- Use supplied logo for header and launcher; acknowledge low-resolution source.
- No fake latency, NPU, version or connection claims.
- Preserve current uncommitted appearance changes and native Gradle cache files. Work in existing mobile feature branch and separate server feature branch; no push/merge. No automatic commits of preexisting edits.

## Tasks
- [ ] 1: Description schema/routes and form. Tests: missing/empty/multiline/max length, serialize and key masking. RED then GREEN; run server suite.
- [ ] 2: Tiny appearance. Tests: parse and width-independent 0.8. RED then GREEN; run mobile suite.
- [ ] 3: Logo assets/configuration. Use attached image; produce safe padded launcher assets, inspect dimensions/config.
- [ ] 4: Shared header/tab: supplied logo, contextual Add, settings, preserve introduction, safe-area and horizontal pills.
- [ ] 5: Models: real counts/search name/code/description, expandable rows and separate selection, existing errors/loading/delete preserved. Test pure search and selection actions where possible.
- [ ] 6: Full suites/typecheck/lints, independent review, fix important regressions, device verification if available.

## Review Focus
- Missing admin key/error must not look like empty success.
- Selected model hidden by search does not change selection.
- Description-only edit must not invoke translator verification.
- Tiny/large on narrow screens, dark contrast and Android insets.
- No full keys or fake connection status; old server payload remains compatible.
