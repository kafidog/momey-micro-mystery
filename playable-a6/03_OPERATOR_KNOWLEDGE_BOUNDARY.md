# Operator Knowledge Boundary

## 岬衛-7 knows

- the normalized session seed and the fixed profile derived from it;
- the incident clock;
- authored facility procedure durations;
- records and sensors explicitly named by each dialogue row;
- which local role diagnostic has actually been confirmed;
- the fixed consequence after a human-confirmed final action.

## 岬衛-7 does not know

- human intent, fear, preference, or moral priority;
- answers to the three unselected diagnostics;
- facts outside connected logs, sensors, and protocol records;
- the team's cross-phone state;
- a future consequence before the action is confirmed;
- which action the humans should take.

## It can verify

Only the selected authored role diagnostic: O1/O2, R1/R2, or S1/S2. The returned card identifies what was found, what it means, and what remains unknown.

## It cannot verify

Any unselected diagnostic or arbitrary player question. There is no text input and no dynamic answer generation. The in-world boundary is represented by copy such as: “仍不知道” and “岬衛-7 不會補上答案.”

Knowledge contradiction contract: every profile-specific line identifies a `KNOWLEDGE_SOURCE`, and the runtime consequence is read from the same immutable profile object.
