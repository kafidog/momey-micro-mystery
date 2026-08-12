# Defect Report

## Resolved

### A6-C01 — audio-unavailable blank page

- Severity before fix: P0 under A6 standard.
- Reproduction: remove `window.speechSynthesis` before page load.
- Cause: end-of-file listener guard checked property presence, then called `addEventListener` on an undefined value.
- Fix: capability checks now require an object and callable method; speak, cancel, voice-list, and listener paths fail safely.
- Verification: no-audio rendered context kept captions and reached diagnostic choices; full smoke reran PASS.

### A6-T01 — cross-realm test comparison

- Classification: test-only issue, not runtime defect.
- Cause: `deepStrictEqual` compared arrays created inside a VM realm.
- Fix: convert to host arrays before comparison; no product assertion was removed.

## Final counts

- P0: 0
- Core P1: 0
- console issues: 0
- known limitations: see `21_KNOWN_LIMITATIONS.md`.
