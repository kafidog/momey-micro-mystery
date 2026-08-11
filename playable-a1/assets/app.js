(() => {
  "use strict";

  const body = document.body;
  if (!body || !body.matches("[data-playable-a1][data-seat]")) return;

  const seat = String(body.dataset.seat || "");
  const storageKey = `momey-playable-a1:${seat}`;
  const stageLabels = ["準備", "私密", "交換", "發現", "查證", "共識", "後果"];
  const defaultState = () => ({
    seat,
    stage: 0,
    recontextConfirmed: false,
    verification: null,
    commitment: null,
    commitConfirmed: false
  });

  const readState = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!parsed || parsed.seat !== seat) return defaultState();
      const recontextConfirmed = parsed.recontextConfirmed === true;
      const rawStage = Number.isInteger(parsed.stage) ? Math.max(0, Math.min(6, parsed.stage)) : 0;
      const verification = parsed.verification === "A" || parsed.verification === "B" ? parsed.verification : null;
      const commitment = parsed.commitment === "seal" || parsed.commitment === "delay" ? parsed.commitment : null;
      const commitConfirmed = parsed.commitConfirmed === true && Boolean(commitment) && recontextConfirmed;
      const stage = commitConfirmed ? 6 : (!recontextConfirmed && rawStage > 3 ? 3 : rawStage);
      return { seat, stage, recontextConfirmed, verification, commitment, commitConfirmed };
    } catch {
      return defaultState();
    }
  };

  const state = readState();

  const saveState = () => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      seat,
      stage: state.stage,
      recontextConfirmed: state.recontextConfirmed,
      verification: state.verification,
      commitment: state.commitment,
      commitConfirmed: state.commitConfirmed
    }));
  };

  const panels = [...document.querySelectorAll("[data-stage-panel]")];
  const markers = [...document.querySelectorAll("[data-stage-marker]")];
  const recontextCheck = document.querySelector("[data-recontext-check]");
  const recontextConfirm = document.querySelector("[data-action='confirm-recontext']");
  const recontextDefinition = document.querySelector("[data-recontext-definition]");
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
    if (target === 4 && !state.recontextConfirmed) return;
    if (target === 5 && !state.verification) return;
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

    if (recontextCheck && state.recontextConfirmed) recontextCheck.checked = true;
    if (recontextDefinition) recontextDefinition.hidden = state.stage !== 3 || !state.recontextConfirmed;
    if (recontextConfirm) {
      recontextConfirm.disabled = state.stage !== 3 || state.recontextConfirmed || !recontextCheck?.checked;
    }
    const recontextContinue = document.querySelector("[data-action='continue-recontext']");
    if (recontextContinue) recontextContinue.disabled = state.stage !== 3 || !state.recontextConfirmed;

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
        ? `本席已選 ${state.verification}。請用自己的話把這張結果說給另外兩席；未選的一項仍可信，但還沒有被確認。`
        : "先談你們最想釐清的問題，再在各機選同一項。兩項都可信，但都還沒有被確認。";
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
    if (state.stage === 6) announce("本席已完成。讀完結局，抬頭談談你們保住了什麼。");
  };

  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    if (action === "to-stage") {
      setStage(actionTarget.dataset.targetStage);
      return;
    }
    if (action === "confirm-recontext" && state.stage === 3 && !state.recontextConfirmed && recontextCheck?.checked) {
      state.recontextConfirmed = true;
      saveState();
      render();
      announce("系統狀態定義已打開。現在請一起讀出它的邊界。");
      return;
    }
    if (action === "continue-recontext" && state.stage === 3 && state.recontextConfirmed) {
      setStage(4);
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
      announce("已記住本席選擇。請自由討論，三人同意後再確認。");
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
      if (recontextCheck) recontextCheck.checked = false;
      if (verbalConsensus) verbalConsensus.checked = false;
      if (resetConfirmation) resetConfirmation.hidden = true;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      focusCurrentHeading();
      announce("本席進度已清除，回到準備階段。");
    }
  });

  recontextCheck?.addEventListener("change", render);
  verbalConsensus?.addEventListener("change", render);
  window.addEventListener("pageshow", render);
  render();
})();
