# MOMEY PLAYABLE A9R

A9R is a bounded first-run integration pass over A9. It keeps A9's authoritative three-phone live rescue and adds two server-synchronized onboarding layers:

- six short shared incident beats that identify Lin Rui, Gao Cheng, the central isolation gate, the physical tradeoff, and the team objective;
- three ordered, safe training actions where one phone visibly changes another phone before live play.

During timed play, the operator caption collapses to a one-line replayable strip after playback. The role instrument, exact local signal, and timer remain dominant.

## Architecture

- Static client: `playable-a9r/`
- Isolated Cloudflare Worker: `worker-a9r/`
- Durable Object class: `A9RRoom`
- Durable Object binding: `ROOM_A9R`
- Room schema: `momey-a9r-room-v1`
- Frozen operator voice: Kokoro `zm_010`, 16 manifest entries, captions on every phone

The separate Worker is required because briefing beat and cooperative-training progress must survive reconnect and cannot be synchronized robustly by local-only UI state. A9 and its deployment are untouched.

## Local verification

From `worker-a9r/`:

```powershell
npm test
```

Focused suites cover engine authority, six briefing beats, three safe training links, A9/A9R live-trace equivalence, four requested Council scenarios, silent play, counterfactual role influence, Worker source contract, protected scope, six-client room isolation/reconnect, and a full three-mobile-browser session.

## Evidence boundary

Automated and synthetic evidence establishes artifact story coverage, deterministic behavior, technical cross-phone causality, and mobile presentation. It does not establish actual human fun, willingness to pay, replay desire, commercial demand, social role dominance in real humans, or real human first-run duration.

Deployment status is recorded in `CODEX_HANDOFF.md` after release verification.
