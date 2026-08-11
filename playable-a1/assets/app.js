(() => {
  "use strict";

  const body = document.body;
  if (!body || !body.matches("[data-playable-a1][data-seat]")) return;

  const seat = String(body.dataset.seat || "");
  const storageKey = `momey-playable-a1:${seat}`;
  const stageLabels = ["準備", "私密", "交換", "發現", "查證", "共識", "後果"];
  const isChoice = (value) => value === "A" || value === "B";
  const isCommitment = (value) => value === "seal" || value === "delay";

  const defaultState = () => ({
    seat,
    stage: 0,
    recontextConfirmed: false,
    verificationDraft: null,
    verificationConfirmed: false,
    commitment: null,
    commitConfirmed: false
  });

  const readState = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!parsed || parsed.seat !== seat) return defaultState();

      const recontextConfirmed = parsed.recontextConfirmed === true;
      const verificationDraft = isChoice(parsed.verificationDraft)
        ? parsed.verificationDraft
        : isChoice(parsed.verification)
          ? parsed.verification
          : null;
      const verificationConfirmed = parsed.verificationConfirmed === true && Boolean(verificationDraft);
      const commitment = isCommitment(parsed.commitment) ? parsed.commitment : null;
      const commitConfirmed = parsed.commitConfirmed === true
        && Boolean(commitment)
        && recontextConfirmed
        && verificationConfirmed;
      const rawStage = Number.isInteger(parsed.stage) ? Math.max(0, Math.min(6, parsed.stage)) : 0;
      const stage = commitConfirmed
        ? 6
        : !recontextConfirmed && rawStage > 3
          ? 3
          : !verificationConfirmed && rawStage > 4
            ? 4
            : rawStage > 5 && !commitment
              ? 5
              : rawStage;

      return {
        seat,
        stage,
        recontextConfirmed,
        verificationDraft,
        verificationConfirmed,
        commitment,
        commitConfirmed
      };
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
      verificationDraft: state.verificationDraft,
      verificationConfirmed: state.verificationConfirmed,
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
  const verificationConsensus = document.querySelector("[data-verification-consensus]");
  const confirmVerification = document.querySelector("[data-action='confirm-verification']");
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

  const renderRecontextDefinition = () => {
    if (!recontextDefinition) return;
    if (!state.recontextConfirmed) {
      recontextDefinition.replaceChildren();
      recontextDefinition.hidden = true;
      return;
    }

    if (!recontextDefinition.hasChildNodes()) {
      const heading = document.createElement("strong");
      heading.textContent = "狀態定義";
      const detail = document.createElement("span");
      detail.textContent = "0 代表確認服務現在無法報告任何人；它不等於 Sector C 沒有人。";
      recontextDefinition.append(heading, detail);
    }
    recontextDefinition.hidden = state.stage !== 3;
  };

  const setStage = (nextStage) => {
    const target = Number(nextStage);
    if (!Number.isInteger(target) || target < 0 || target > 6) return;
    if (target > state.stage + 1) return;
    if (target === 4 && !state.recontextConfirmed) return;
    if (target === 5 && !state.verificationConfirmed) return;
    if (target === 6 && !state.commitConfirmed) return;
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
    renderRecontextDefinition();
    if (recontextConfirm) {
      recontextConfirm.disabled = state.stage !== 3 || state.recontextConfirmed || !recontextCheck?.checked;
    }
    const recontextContinue = document.querySelector("[data-action='continue-recontext']");
    if (recontextContinue) recontextContinue.disabled = state.stage !== 3 || !state.recontextConfirmed;

    verificationButtons.forEach((button) => {
      const selected = state.verificationDraft === button.dataset.choice;
      button.classList.toggle("is-selected", selected);
      button.disabled = state.stage !== 4 || state.verificationConfirmed;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    if (verificationConsensus && state.verificationConfirmed) verificationConsensus.checked = true;
    resultCards.forEach((card) => {
      card.hidden = state.stage !== 4
        || !state.verificationConfirmed
        || card.dataset.verificationResult !== state.verificationDraft;
    });
    const verificationStatus = document.querySelector("[data-verification-status]");
    if (verificationStatus) {
      verificationStatus.textContent = state.verificationConfirmed
        ? `已確認 ${state.verificationDraft}。每席看自己的片段，說完再繼續。`
        : state.verificationDraft
          ? `已暫存 ${state.verificationDraft}。三人都確認選同一項了嗎？結果尚未開啟。`
          : "先談要釐清的問題，再暫存 A 或 B；結果尚未開啟。";
    }
    if (confirmVerification) {
      confirmVerification.disabled = state.stage !== 4
        || !state.verificationDraft
        || state.verificationConfirmed
        || !verificationConsensus?.checked;
    }
    const continueVerification = document.querySelector("[data-action='continue-verification']");
    if (continueVerification) continueVerification.disabled = state.stage !== 4 || !state.verificationConfirmed;

    commitmentButtons.forEach((button) => {
      const selected = state.commitment === button.dataset.commitment;
      button.classList.toggle("is-selected", selected);
      button.disabled = state.stage !== 5 || state.commitConfirmed;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    if (confirmCommitment) {
      confirmCommitment.disabled = state.stage !== 5
        || !state.commitment
        || !verbalConsensus?.checked
        || state.commitConfirmed;
    }
    finalCards.forEach((card) => {
      card.hidden = state.stage !== 6 || card.dataset.finalResult !== state.commitment;
    });
    document.querySelectorAll("[data-interpretation]").forEach((node) => {
      node.hidden = state.stage !== 6
        || !state.verificationConfirmed
        || node.dataset.interpretation !== state.verificationDraft;
    });
    if (state.stage === 6) announce("本席已完成。一起談談誰被保住、誰承擔代價。");
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
      announce("狀態定義已開啟。一起說出它的界線。");
      return;
    }
    if (action === "continue-recontext" && state.stage === 3 && state.recontextConfirmed) {
      setStage(4);
      return;
    }
    if (action === "choose-verification" && state.stage === 4 && !state.verificationConfirmed) {
      const nextVerificationDraft = isChoice(actionTarget.dataset.choice) ? actionTarget.dataset.choice : "A";
      if (state.verificationDraft !== nextVerificationDraft && verificationConsensus) {
        verificationConsensus.checked = false;
      }
      state.verificationDraft = nextVerificationDraft;
      saveState();
      render();
      announce(`已暫存查證 ${state.verificationDraft}。結果尚未開啟。`);
      return;
    }
    if (action === "confirm-verification"
      && state.stage === 4
      && state.verificationDraft
      && !state.verificationConfirmed
      && verificationConsensus?.checked) {
      state.verificationConfirmed = true;
      saveState();
      render();
      announce(`查證 ${state.verificationDraft} 已確認；本席片段已開啟。`);
      return;
    }
    if (action === "continue-verification" && state.stage === 4 && state.verificationConfirmed) {
      setStage(5);
      return;
    }
    if (action === "choose-commitment" && state.stage === 5 && !state.commitConfirmed) {
      state.commitment = actionTarget.dataset.commitment === "delay" ? "delay" : "seal";
      saveState();
      render();
      announce("已暫存本席選擇。談完後再確認。");
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
      if (verificationConsensus) verificationConsensus.checked = false;
      if (verbalConsensus) verbalConsensus.checked = false;
      if (resetConfirmation) resetConfirmation.hidden = true;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      focusCurrentHeading();
      announce("本席進度已清除，回到準備階段。");
    }
  });

  recontextCheck?.addEventListener("change", render);
  verificationConsensus?.addEventListener("change", render);
  verbalConsensus?.addEventListener("change", render);
  window.addEventListener("pageshow", render);
  render();
})();
