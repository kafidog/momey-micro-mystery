# Session Seed Architecture

The entry page creates a six-character event code from a restricted unambiguous alphabet. The same seed is carried in each role URL:

`role-N.html?seed=CASE1`

`normalizeSeed()` uppercases, removes non-alphanumerics, and limits length to eight characters. `deriveProfile()` applies deterministic FNV-style hashing and maps parity to one of two fixed profiles. Contract tests prove case/separator normalization, same-seed determinism, and reachability of both profiles.

Players may see and compare the neutral event code. They do not see internal profile IDs or labels.

Persistence keys:

`momey-a6:{seed}:role:{role}`

This isolates version, event, and seat. Audio settings are A6-local. Reset removes only the current A6 seed prefix and creates a new event code; it never calls `localStorage.clear()`.

No seed is secret or cryptographic. It coordinates deterministic authored content without a backend.
