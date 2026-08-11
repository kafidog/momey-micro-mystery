(() => {
  "use strict";

  const STORAGE_PREFIX = "momey-a2:";
  const SHARED_KEY = `${STORAGE_PREFIX}shared`;
  const ROLE_IDS = ["1", "2", "3"];

  const roleData = {
    "1": {
      name: "事件指揮",
      shortName: "指揮",
      tagline: "把事故的先後順序整理成隊伍能用的時間線。",
      duty: "整理指揮紀錄，確認封閉與救援在同一個西側窗口裡怎麼排。",
      actionTitle: "重建指揮紀錄快取",
      actionPrompt: "用指揮備援鏈路拉回事故前後的紀錄，讓隊伍知道封閉與救援各需要多久。",
      actionWhy: "你能讀取指揮紀錄器快取，重建兩個西側流程的時間。",
      actionKey: "command-cache",
      actionButton: "執行：重建紀錄快取",
      result: {
        source: "指揮備援鏈路／紀錄器快取",
        time: "18:48，事故紀錄重建完成",
        content: "遠端封閉需要 20 秒；救援推車從授權到清出西側路線需要 95 秒。同一個西側窗口裡，封閉開始後推車路線就會被切斷，兩個流程不能並行。",
        unknown: "這段時間裡，東閘撐點能不能承受壓力前緣，紀錄器沒有答案。"
      }
    },
    "2": {
      name: "救援聯絡",
      shortName: "救援",
      tagline: "把人的回應帶回隊伍，但把訊號能證明的範圍說清楚。",
      duty: "查詢林芮的穿戴頻道，分辨回應的內容和它仍跨不過的訊號邊界。",
      actionTitle: "查詢林芮的穿戴頻道",
      actionPrompt: "用救援備援鏈路呼叫她的裝置，將回傳的訊號連同限制帶回隊伍。",
      actionWhy: "你能用救援備援鏈路查詢穿戴頻道，取得與林芮裝置簽名相符的回應。",
      actionKey: "wearable-query",
      actionButton: "執行：查詢穿戴頻道",
      result: {
        source: "救援備援鏈路／林芮穿戴頻道",
        time: "18:48，查詢回傳一個簽名封包",
        content: "收到一個與林芮裝置簽名相符、刻意做出的兩點回應。它表示有人曾經主動碰過裝置，但沒有多出位置或路線資料。",
        unknown: "停電讓我們無法證明這是即時回應還是緩衝資料，也無法由它證明西側路線現在是否暢通。"
      }
    },
    "3": {
      name: "結構安全",
      shortName: "安全",
      tagline: "把壓力如何走到東閘撐點說清楚，讓代價不會被一句「撐住」帶過。",
      duty: "讀取類比壓力波形，說清楚 95 秒維持東閘會讓誰承受什麼。",
      actionTitle: "讀取類比壓力波形",
      actionPrompt: "從還能工作的類比線路讀取一段 95 秒波形，讓隊伍看見東閘撐點的實際壓力。",
      actionWhy: "你能用安全備援鏈路讀取類比壓力線，將壓力前緣與東閘撐點對齊。",
      actionKey: "pressure-waveform",
      actionButton: "執行：讀取壓力波形",
      result: {
        source: "安全備援鏈路／東閘類比壓力線",
        time: "18:48，95 秒波形讀取完成",
        content: "如果東閘撐點維持 95 秒，壓力前緣會在這段時間內抵達東閘。高承必須留在撐點，才能讓控制廊維持隔離。",
        unknown: "這段波形沒有測出撐架的確切承載上限；它只告訴我們 95 秒會把壓力帶到東閘。"
      }
    }
  };

  const verificationOptions = {
    A: {
      key: "A",
      title: "西側路線掃描",
      source: "剩餘電容／西側掃描脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認林芮現在仍在西側抬高避難龕；救援推車軌道仍可通，從授權到清出西側路線需要 95 秒。",
      unknown: "東閘撐架能不能承受完整的 95 秒，這次掃描沒有測量。"
    },
    B: {
      key: "B",
      title: "東閘載重測試",
      source: "剩餘電容／東閘載重脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認東閘撐架無法承受完整的 95 秒；高承必須留在撐點，才能防止控制廊隔離閘開啟。",
      unknown: "林芮穿戴頻道的兩點回應是不是即時傳送，這次測試沒有確認。"
    }
  };

  const consequences = {
    "A|close": {
      decision: "立即封閉",
      next: "封閉指令現在開始，西側推車路線被切斷；高承放開已穩定的東閘撐點並撤出。",
      later: "後來確認，林芮當時仍活著，在封閉障礙後等待；替代進入路線到達前，她失去生命。"
    },
    "A|hold": {
      decision: "維持 95 秒",
      next: "東閘撐點維持 95 秒，救援推車沿可通軌道清出西側路線，把林芮帶出；壓力前緣同時抵達東閘。",
      later: "後來確認，高承留在撐點直到控制廊隔離完成；他在東閘撐架失效中死亡。"
    },
    "B|close": {
      decision: "立即封閉",
      next: "封閉指令現在開始，西側推車路線被切斷；高承放開已穩定的東閘撐點並撤出。",
      later: "後來確認，林芮當時仍活著，在封閉障礙後等待；替代進入路線到達前，她失去生命。"
    },
    "B|hold": {
      decision: "維持 95 秒",
      next: "隊伍維持東閘撐點 95 秒，讓西側推車完成清線；壓力前緣抵達東閘，撐架在控制廊隔離完成後失效。",
      later: "後來確認，救援推車把林芮帶出；高承留在撐點直到控制廊隔離完成，並在失效中死亡。"
    }
  };

  const initialSeat = {
    actionComplete: false,
    actionAt: null,
    teamReady: false,
    teamReadyAt: null
  };
  const initialShared = {
    verificationDraft: null,
    verificationConfirmed: null,
    verificationResult: null,
    finalDraft: null,
    finalConfirmed: null,
    consequence: null
  };

  const page = document.body.dataset.page || "index";
  const currentRole = document.body.dataset.role || null;

  function storage() {
    try {
      return window.localStorage;
    } catch (_error) {
      return null;
    }
  }

  function readJson(key, fallback) {
    const store = storage();
    if (!store) return { ...fallback };
    try {
      const raw = store.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch (_error) {
      return { ...fallback };
    }
  }

  function writeJson(key, value) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // The prototype still renders without persistence if storage is unavailable.
    }
  }

  function seatKey(roleId) {
    return `${STORAGE_PREFIX}seat:${roleId}`;
  }

  function readSeat(roleId) {
    return readJson(seatKey(roleId), initialSeat);
  }

  function writeSeat(roleId, value) {
    writeJson(seatKey(roleId), { ...initialSeat, ...value });
  }

  function readShared() {
    return readJson(SHARED_KEY, initialShared);
  }

  function writeShared(value) {
    writeJson(SHARED_KEY, { ...initialShared, ...value });
  }

  function currentSessionReady() {
    if (!currentRole) return false;
    const seat = readSeat(currentRole);
    return seat.actionComplete === true && seat.teamReady === true;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function evidenceCard(evidence, extraClass = "") {
    return `<div class="evidence-card ${extraClass}">
      <dl class="evidence-list">
        <div><dt>來源</dt><dd>${escapeHtml(evidence.source)}</dd></div>
        <div><dt>時間</dt><dd>${escapeHtml(evidence.time)}</dd></div>
        <div><dt>內容</dt><dd>${escapeHtml(evidence.content)}</dd></div>
        <div><dt>還不能確定</dt><dd>${escapeHtml(evidence.unknown)}</dd></div>
      </dl>
    </div>`;
  }

  function renderCurrentAction(roleId) {
    const role = roleData[roleId];
    const seat = readSeat(roleId);
    const resultPanel = document.querySelector("[data-role-action-result]");
    const actionButton = document.querySelector("[data-role-action-button]");
    const state = document.querySelector("[data-action-state]");
    if (!resultPanel || !actionButton) return;

    if (seat.actionComplete) {
      actionButton.disabled = true;
      actionButton.textContent = "已執行這項備援操作";
      if (state) {
        state.textContent = "已完成";
        state.classList.add("is-complete");
      }
      setText("[data-evidence-source]", role.result.source);
      setText("[data-evidence-time]", role.result.time);
      setText("[data-evidence-content]", role.result.content);
      setText("[data-evidence-unknown]", role.result.unknown);
      resultPanel.hidden = false;
    } else {
      actionButton.disabled = false;
      actionButton.textContent = role.actionButton;
      if (state) {
        state.textContent = "待執行";
        state.classList.remove("is-complete");
      }
      resultPanel.hidden = true;
    }
  }

  function renderRolePage(roleId) {
    const role = roleData[roleId];
    if (!role) return;
    setText("[data-role-title]", role.name);
    setText("[data-role-tagline]", role.tagline);
    setText("[data-role-duty]", role.duty);
    setText("[data-role-action-why]", role.actionWhy);
    setText("[data-role-action-title]", role.actionTitle);
    setText("[data-role-action-prompt]", role.actionPrompt);
    const button = document.querySelector("[data-role-action-button]");
    if (button) {
      button.dataset.actionKey = role.actionKey;
      button.textContent = role.actionButton;
    }
    renderCurrentAction(roleId);
    const teamStage = document.querySelector("[data-team-stage]");
    if (teamStage) teamStage.innerHTML = renderTeamStages();
  }

  function renderContributionLedger() {
    const contributionCopy = {
      "1": "說明 20 秒封閉與 95 秒救援的時間關係",
      "2": "說明兩點回應，以及即時性與路線仍未知",
      "3": "說明 95 秒壓力、高承責任與承載未知"
    };
    return `<ul class="action-ledger" aria-label="公開交換需要聽到的三份角色貢獻">
      ${ROLE_IDS.map((roleId) => `<li class="ledger-row contribution-row">
        <span class="ledger-mark" aria-hidden="true">${roleId.padStart(2, "0")}</span>
        <span><strong>${roleData[roleId].name}</strong><small>${contributionCopy[roleId]}</small></span>
        <span class="ledger-state">需要聽到</span>
      </li>`).join("")}
    </ul>`;
  }

  function renderSharedEvidence() {
    return `<div class="shared-evidence-grid">
      ${ROLE_IDS.map((roleId) => `<article class="shared-evidence">
        <div class="evidence-role"><span>${roleId.padStart(2, "0")}</span><strong>${roleData[roleId].name}</strong></div>
        ${evidenceCard(roleData[roleId].result)}
      </article>`).join("")}
    </div>`;
  }

  function renderVerification(shared, ready) {
    const confirmed = ready ? shared.verificationConfirmed : null;
    const draft = ready ? shared.verificationDraft : null;
    const locked = Boolean(confirmed);
    const selectedLabel = draft ? verificationOptions[draft].title : "尚未選擇";
    const optionHtml = Object.values(verificationOptions).map((option) => {
      const selected = draft === option.key;
      return `<button class="verification-option ${selected ? "is-selected" : ""}" type="button" data-verify-option="${option.key}" ${(!ready || locked) ? "disabled" : ""} aria-pressed="${selected}">
        <span class="choice-key">${option.key}</span>
        <span class="choice-title">${option.title}</span>
        <span class="choice-line"><b>可以知道</b>${option.key === "A" ? "林芮現在的位置，以及西側推車軌道能不能走完 95 秒。" : "東閘撐架能不能承受完整 95 秒，以及高承是否必須留在撐點。"}</span>
        <span class="choice-line"><b>仍不知道</b>${option.unknown}</span>
      </button>`;
    }).join("");

    const resultHtml = confirmed
      ? `<div class="verification-result" data-verification-result>
          <div class="panel-label">查證結果｜${confirmed} 已鎖定</div>
          <h3>${verificationOptions[confirmed].title}</h3>
          ${evidenceCard(verificationOptions[confirmed], "verified-evidence")}
        </div>`
      : "";

    return `<section class="stage-block verification-stage" aria-labelledby="verification-title">
      <div class="stage-title"><span>STAGE 06</span><h2 id="verification-title">有限查證</h2></div>
      <p class="stage-lede">剩餘電容只能打一個高能脈衝。兩個選項各自打開一個未知；隊伍只能確認其中一個。</p>
      <div class="verification-grid">${optionHtml}</div>
      <div class="draft-row"><span>查證草稿</span><strong>${selectedLabel}</strong><small>${locked ? "已確認，選擇已鎖定" : "可在確認前更換"}</small></div>
      <button class="primary-button confirm-button" type="button" data-verify-confirm ${(!ready || !draft || locked) ? "disabled" : ""}>${locked ? "已確認唯一查證" : "確認這次唯一查證"}</button>
      ${!ready ? `<p class="stage-lock">先完成這支手機的角色操作，再由你們口頭確認三份結果已公開交換。</p>` : ""}
      ${resultHtml}
    </section>`;
  }

  function renderDecision(shared) {
    const verified = verificationOptions[shared.verificationConfirmed];
    const locked = Boolean(shared.finalConfirmed);
    const draft = shared.finalDraft;
    const summaryKnown = [
      "三支備援鏈路都在 18:48 回報同一個事故時刻。",
      "20 秒封閉會切斷西側推車路線；救援推車清線需要 95 秒。",
      verified.content
    ];
    const summaryUnknown = [verified.unknown, "沒有再多一個高能脈衝，未選的查證不會補回來。"];
    return `<section class="stage-block decision-stage" aria-labelledby="decision-title">
      <div class="stage-title"><span>STAGE 08</span><h2 id="decision-title">共同決定</h2></div>
      <div class="decision-summary">
        <div><h3>已確認</h3><ul>${summaryKnown.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        <div><h3>仍未知</h3><ul>${summaryUnknown.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        <div><h3>現在必須決定</h3><p>立即封閉，或維持 95 秒。</p></div>
      </div>
      <div class="decision-grid">
        <button class="decision-choice decision-close ${draft === "close" ? "is-selected" : ""}" type="button" data-final-choice="close" ${locked ? "disabled" : ""} aria-pressed="${draft === "close"}">
          <span class="choice-key">選項 1</span><strong>立即封閉</strong><span>現在啟動封閉，封住西側推車路線；高承放開東閘撐點並撤出。</span>
        </button>
        <button class="decision-choice decision-hold ${draft === "hold" ? "is-selected" : ""}" type="button" data-final-choice="hold" ${locked ? "disabled" : ""} aria-pressed="${draft === "hold"}">
          <span class="choice-key">選項 2</span><strong>維持 95 秒</strong><span>讓西側救援推車完成清線；高承維持東閘撐點直到控制廊隔離。</span>
        </button>
      </div>
      <div class="draft-row"><span>決定草稿</span><strong>${draft === "close" ? "立即封閉" : draft === "hold" ? "維持 95 秒" : "尚未選擇"}</strong><small>${locked ? "已確認，決定已鎖定" : "可在確認前更換"}</small></div>
      <button class="primary-button confirm-button" type="button" data-final-confirm ${(!draft || locked) ? "disabled" : ""}>${locked ? "已確認共同決定" : "確認共同決定"}</button>
    </section>`;
  }

  function renderConsequence(shared) {
    if (!shared.finalConfirmed || !shared.verificationConfirmed) return "";
    const branch = consequences[`${shared.verificationConfirmed}|${shared.finalConfirmed}`];
    if (!branch) return "";
    return `<section class="stage-block consequence-stage" aria-labelledby="consequence-title">
      <div class="stage-title"><span>STAGE 09</span><h2 id="consequence-title">後果</h2></div>
      <div class="consequence-grid">
        <div><h3>你們的決定</h3><p>${escapeHtml(branch.decision)}</p></div>
        <div><h3>接著發生</h3><p>${escapeHtml(branch.next)}</p></div>
        <div><h3>後來確認</h3><p>${escapeHtml(branch.later)}</p></div>
      </div>
      <p class="human-question">下一句話，你們會把什麼告訴下一個班次？</p>
    </section>`;
  }

  function renderTeamStages() {
    const seat = currentRole ? readSeat(currentRole) : { ...initialSeat };
    const ownActionComplete = seat.actionComplete === true;
    const ready = currentSessionReady();
    const shared = readShared();
    const evidence = ready
      ? `<div class="evidence-intro"><span class="panel-label">共同證據</span><p>你們已在同一個房間互相說明三份角色結果。把它們放在一起，未知仍然存在。</p></div>${renderSharedEvidence()}`
      : "";
    const sharingGate = ownActionComplete
      ? `<p class="discussion-question">把你知道的說出來。你們認為現在最大的未知是什麼？</p>
        ${renderContributionLedger()}
        <div class="draft-row"><span>本機交換狀態</span><strong>${seat.teamReady ? "已確認" : "尚未確認"}</strong><small>${seat.teamReady ? "這支手機已記錄你們完成口頭交換" : "確認前三個角色應各自完成操作並說出結果"}</small></div>
        <button class="primary-button confirm-button" type="button" data-team-ready ${seat.teamReady ? "disabled" : ""}>${seat.teamReady ? "已確認公開交換完成" : "三個角色都完成操作，也把結果說給彼此了"}</button>
        <p class="stage-lock">這支手機不會偵測其他裝置；這裡只記錄你們的口頭確認。</p>`
      : `<p class="stage-lock">先完成這支手機的角色操作，再把結果說給另外兩位隊友。</p>`;

    return `<div class="team-flow">
      <section class="stage-block sharing-stage" aria-labelledby="sharing-title">
        <div class="stage-title"><span>STAGE 04</span><h2 id="sharing-title">公開交換</h2></div>
        ${sharingGate}
        ${evidence}
      </section>
      <section class="stage-block escalation-stage" aria-labelledby="escalation-title">
        <div class="stage-title"><span>STAGE 05</span><h2 id="escalation-title">事故升級</h2></div>
        <p>共同時間線停在 18:48。水勢繼續往控制廊推進，西側救援和東閘撐點的風險會在同一個 95 秒窗口碰到一起。</p>
        <div class="unknown-pair"><div><span>未知一</span><strong>林芮的回應與西側路線</strong><small>回應可能來自人，但是否即時、路線是否打得開，仍要查證。</small></div><div><span>未知二</span><strong>東閘撐點的承載</strong><small>維持 95 秒可以爭取救援，但撐點能否撐住還沒有答案。</small></div></div>
      </section>
      ${renderVerification(shared, ready)}
      ${ready && shared.verificationConfirmed ? renderDecision(shared) : `<section class="stage-block locked-decision"><div class="stage-title"><span>STAGE 08</span><h2>共同決定</h2></div><p>先完成本機公開交換確認與一次有限查證，再把「立即封閉」和「維持 95 秒」放在同一張桌上。</p></section>`}
      ${ready ? renderConsequence(shared) : ""}
      <div class="team-reset"><button class="text-button" type="button" data-reset>清除本次 A2 進度</button></div>
    </div>`;
  }

  function resetPrototype() {
    const store = storage();
    if (store) {
      try {
        Object.keys(store).filter((key) => key.startsWith(STORAGE_PREFIX)).forEach((key) => store.removeItem(key));
      } catch (_error) {
        // Ignore storage errors and still return to the entry surface.
      }
    }
    window.location.href = page === "index" ? "index.html" : "index.html";
  }

  function handleClick(event) {
    const resetButton = event.target.closest("[data-reset]");
    if (resetButton) {
      resetPrototype();
      return;
    }

    if (page !== "role" || !currentRole) return;

    const actionButton = event.target.closest("[data-role-action-button]");
    if (actionButton && !actionButton.disabled) {
      const role = roleData[currentRole];
      const seat = readSeat(currentRole);
      writeSeat(currentRole, { ...seat, actionComplete: true, actionAt: "18:48", actionKey: role.actionKey });
      renderRolePage(currentRole);
      return;
    }

    const teamReadyButton = event.target.closest("[data-team-ready]");
    if (teamReadyButton && !teamReadyButton.disabled) {
      const seat = readSeat(currentRole);
      if (seat.actionComplete && !seat.teamReady) {
        writeSeat(currentRole, { ...seat, teamReady: true, teamReadyAt: "18:48，完成口頭交換確認" });
        renderRolePage(currentRole);
      }
      return;
    }

    const verifyOption = event.target.closest("[data-verify-option]");
    if (verifyOption && !verifyOption.disabled && currentSessionReady()) {
      const selected = verifyOption.dataset.verifyOption;
      const shared = readShared();
      writeShared({ ...shared, verificationDraft: selected });
      renderRolePage(currentRole);
      return;
    }

    const verifyConfirm = event.target.closest("[data-verify-confirm]");
    if (verifyConfirm && !verifyConfirm.disabled && currentSessionReady()) {
      const shared = readShared();
      if (shared.verificationDraft && !shared.verificationConfirmed) {
        const option = verificationOptions[shared.verificationDraft];
        writeShared({
          ...shared,
          verificationConfirmed: option.key,
          verificationResult: { ...option }
        });
        renderRolePage(currentRole);
      }
      return;
    }

    const finalChoice = event.target.closest("[data-final-choice]");
    if (finalChoice && !finalChoice.disabled && currentSessionReady()) {
      const shared = readShared();
      if (shared.verificationConfirmed && !shared.finalConfirmed) {
        writeShared({ ...shared, finalDraft: finalChoice.dataset.finalChoice });
        renderRolePage(currentRole);
      }
      return;
    }

    const finalConfirm = event.target.closest("[data-final-confirm]");
    if (finalConfirm && !finalConfirm.disabled && currentSessionReady()) {
      const shared = readShared();
      if (shared.verificationConfirmed && shared.finalDraft && !shared.finalConfirmed) {
        const branchKey = `${shared.verificationConfirmed}|${shared.finalDraft}`;
        writeShared({
          ...shared,
          finalConfirmed: shared.finalDraft,
          consequence: consequences[branchKey]
        });
        renderRolePage(currentRole);
      }
    }
  }

  function init() {
    document.addEventListener("click", handleClick);
    if (page === "role" && currentRole) renderRolePage(currentRole);
    if (typeof window !== "undefined") {
      window.addEventListener("storage", () => {
        if (page === "role" && currentRole) renderRolePage(currentRole);
      });
      window.MomeyA2 = {
        readSeat,
        readShared,
        currentSessionReady,
        resetPrototype
      };
    }
  }

  init();
})();
