# Diagnostic Slot Architecture

One play exposes three selected checks out of six authored checks.

1. All humans see that each role has one slot.
2. They discuss which unknowns to cover; no speaking order is prescribed.
3. Each role makes a provisional local choice.
4. The provisional choice may change without revealing a result.
5. Explicit confirmation locks that role's slot.
6. Only the confirmed profile/role result is rendered.
7. The unchosen role result remains absent for that play.

This replaces A5's global team A/B check and removes cross-phone mismatch risk at the diagnostic layer. Local phones still rely on honest same-room coordination at shared boundaries; the UI never claims remote synchronization.

State fields: `planningConfirmed`, `diagnosticDraft`, `diagnosticConfirmed`. The localStorage key includes version, normalized seed, and role.
