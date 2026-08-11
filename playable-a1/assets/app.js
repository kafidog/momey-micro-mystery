(() => {
  "use strict";

  const body = document.body;
  if (!body || !body.matches("[data-playable-a1][data-seat]")) return;

  const seat = String(body.dataset.seat || "");
  const storageKey = `momey-playable-a1:${seat}`;
  const stageLabels = ["準備", "私密", "交換", "重構", "查證", "共識", "後果"];
  const defaultState = () => ({
    seat,
    stage: 0,
    verification: null,
    commitment: null,
    commitConfirmed: false
  });

  const readState = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!parsed || parsed.seat !== seat) return defaultState();
      const stage = Number.isInteger(parsed.stage) ? Math.max(0, Math.min(6, parsed.stage)) : 0;
      const verification = parsed.verification === "A" || parsed.verification === "B" ? parsed.verification : null;
      const commitment = parsed.commitment === "seal" || parsed.commitment === "delay" ? parsed.commitment : null;
      const commitConfirmed = parsed.commitConfirmed === true && Boolean(commitment);
      return { seat, stage: commitConfirmed ? 6 : stage, verification, commitment, commitConfirmed };
    } catch {
      return defaultState();
    }
  };

  const state = readState();

  const saveState = () => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      seat,
      stage: state.stage,
      verification: state.verification,
      commitment: state.commitment,
      commitConfirmed: state.commitConfirmed
    }));
  };

  const panels = [...document.querySelectorAll("[data-stage-panel]")];
  const markers = [...document.querySelectorAll("[data-stage-marker]")];
  const verificationButtons = [...document.querySelectorAll("[data-action='choose-verification']")];
  const commitmentButtons = [...document.querySelectorAll("[data-action='choose-commitment']")];
  const resultCards = [...document.querySelectorAll("[data-verification-result]")];
  const finalCards = [...document.querySelectorAll("[data-final-result]")];
  const verbalConsensus = document.querySelector("[data-verbal-consensus]");
  const confirmCommitment = document.querySelector("[data-action='confirm-commitment']");
  const resetConfirmation = document.querySelector("[data-reset-confirmation]");
  const liveStatus = document.querySelector("[data-live-status]");

  const focusCurrentHeading = () => {
    const heading = document.querySelector(`[data-stage-panel='${state.stage}'] h2`);
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  };

  const announce = (message) => {
    if (liveStatus) liveStatus.textContent = message;
  };

  const setStage = (nextStage) => {
    const target = Number(nextStage);
    if (!Number.isInteger(target) || target < 0 || target > 6) return;
    if (target > state.stage + 1) return;
    state.stage = target;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    focusCurrentHeading();
  };

  const render = () => {
    body.dataset.stage = String(state.stage);
    panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.stagePanel) !== state.stage;
    });
    markers.forEach((marker) => {
      const markerStage = Number(marker.dataset.stageMarker);
      marker.dataset.stageNumber = String(markerStage + 1);
      marker.classList.toggle("is-current", markerStage === state.stage);
      marker.classList.toggle("is-complete", markerStage < state.stage);
      marker.setAttribute("aria-current", markerStage === state.stage ? "step" : "false");
      marker.querySelector("span")?.replaceChildren(document.createTextNode(stageLabels[markerStage]));
    });

    verificationButtons.forEach((button) => {
      const selected = state.verification === button.dataset.choice;
      button.classList.toggle("is-selected", selected);
      button.disabled = state.stage !== 4 || Boolean(state.verification);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    resultCards.forEach((card) => {
      card.hidden = state.stage !== 4 || card.dataset.verificationResult !== state.verification;
    });
    const verificationStatus = document.querySelector("[data-verification-status]");
    if (verificationStatus) {
      verificationStatus.textContent = state.verification
        ? `本席已選 ${state.verification}。請先把查證結果說給另外兩席，再一起進入共識。未選的一項仍可信但未校驗，不等於錯誤。`
        : "尚未選擇。三人先口頭決定只查證一項，再在各機選同一項；未選的一項仍可信但未校驗。";
    }
    const continueVerification = document.querySelector("[data-action='continue-verification']");
    if (continueVerification) continueVerification.disabled = !state.verification;

    commitmentButtons.forEach((button) => {
      const selected = state.commitment === button.dataset.commitment;
      button.classList.toggle("is-selected", selected);
      button.disabled = state.stage !== 5 || state.commitConfirmed;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    if (confirmCommitment) {
      confirmCommitment.disabled = state.stage !== 5 || !state.commitment || !verbalConsensus?.checked || state.commitConfirmed;
    }
    finalCards.forEach((card) => {
      card.hidden = state.stage !== 6 || card.dataset.finalResult !== state.commitment;
    });
    document.querySelectorAll("[data-interpretation]").forEach((node) => {
      node.hidden = state.stage !== 6 || node.dataset.interpretation !== state.verification;
    });
    if (state.stage === 6) announce("本席已完成。結局已鎖定，請三人一起讀完並討論。");
  };

  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    if (action === "to-stage") {
      setStage(actionTarget.dataset.targetStage);
      return;
    }
    if (action === "choose-verification" && state.stage === 4 && !state.verification) {
      state.verification = actionTarget.dataset.choice === "B" ? "B" : "A";
      saveState();
      render();
      announce(`已選擇查證 ${state.verification}。`);
      return;
    }
    if (action === "continue-verification" && state.stage === 4 && state.verification) {
      setStage(5);
      return;
    }
    if (action === "choose-commitment" && state.stage === 5 && !state.commitConfirmed) {
      state.commitment = actionTarget.dataset.commitment === "delay" ? "delay" : "seal";
      saveState();
      render();
      announce("已記住本席選擇。請確認三人已口頭達成同一決定，再按確認。");
      return;
    }
    if (action === "confirm-commitment" && state.stage === 5 && state.commitment && verbalConsensus?.checked) {
      state.commitConfirmed = true;
      state.stage = 6;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      focusCurrentHeading();
      return;
    }
    if (action === "reset-open") {
      if (resetConfirmation) resetConfirmation.hidden = false;
      return;
    }
    if (action === "reset-cancel") {
      if (resetConfirmation) resetConfirmation.hidden = true;
      return;
    }
    if (action === "reset-confirm") {
      window.localStorage.removeItem(storageKey);
      Object.assign(state, defaultState());
      if (verbalConsensus) verbalConsensus.checked = false;
      if (resetConfirmation) resetConfirmation.hidden = true;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      focusCurrentHeading();
      announce("本席進度已清除，回到準備階段。");
    }
  });

  verbalConsensus?.addEventListener("change", render);
  window.addEventListener("pageshow", render);
  render();
})();
