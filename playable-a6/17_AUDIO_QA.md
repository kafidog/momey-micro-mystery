# Audio QA

| Check | Result | Evidence boundary |
| --- | --- | --- |
| zh-TW preferred voice path | PASS in implementation | selection order exact zh-TW → zh → browser default |
| no zh-TW fallback | PASS in implementation | any zh or browser voice may be used |
| no speech API | PASS rendered | page and diagnostic progression remained available |
| captions always visible | PASS rendered | live caption precedes sound attempt |
| overlap handling | PASS contract | `speechSynthesis.cancel()` before new utterance |
| replay voice | PASS control/contract | local replay button calls current authored row |
| mute | PASS control/contract | cancels speech; captions remain |
| shared-audio toggle | PASS rendered | default OFF; any role may enable it |
| SFX volume | PASS implementation heuristic | gain peak 0.035, about 0.24 seconds, no loop |
| visual cue for SFX | PASS rendered | cue pill updates independently of sound success |
| audio blocks progression | NO | no stage awaits audio events |

Voice identity varies by browser and OS. No production VO, music, purchased asset, or external audio service was used.
