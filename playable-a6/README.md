# MOMEY PLAYABLE A6

Static three-human same-room prototype with 岬衛-7, a fully scripted digital incident operator.

Open `index.html` through a static web server. The entry page creates three same-seed role links. Each role gets one of two diagnostics; all information may be shared; humans retain the final action.

Checks:

```text
node --check playable-a6/assets/app.js
node --test playable-a6/tests/contract.test.mjs
node playable-a6/tests/render-smoke.cjs  # with documented Playwright env vars and a local server
```

Technical/internal evidence only. No human playtest, acquisition, payment, analytics, backend, generative AI, or production audio.
