(() => {
  "use strict";

  const STORAGE_PREFIX = "momey-a4:";
  const SHARED_KEY = `${STORAGE_PREFIX}shared`;
  const ROLE_IDS = ["1", "2", "3"];

  const roleData = {
    "1": {
      name: "事件指揮",
      shortName: "指揮",
      number: "01",
      tone: "command",
      eyebrow: "STAGE 02｜角色簡報｜指揮工具",
      tagline: "把事故的先後順序排成隊伍能用的時間線。",
      duty: "整理同一個西側窗口裡，封閉和救援各自需要多久。",
      known: ["18:47 主電力與中央遙測中斷。", "18:48 指揮記錄已接通。", "西側同時有遠端封閉與救援清線流程。"],
      unknown: ["封閉與清線的實際時間關係。", "兩段流程是否會互相切斷。"],
      actionKey: "timeline-alignment",
      actionTitle: "重建 0–95 秒時間線",
      actionPrompt: "先點一段流程，再點它在共同時間軌上的正確終點。兩段都對齊後，衝突才會出現。",
      actionWhy: "你能把兩段流程放進同一個西側窗口，直接看見它們如何重疊。",
      result: {
        source: "指揮記錄／共同 0–95 秒軌",
        time: "18:48，兩段流程已完成時間線對齊",
        content: "遠端封閉需要 20 秒；救援清線需要 95 秒。兩段都在同一個西側窗口，封閉在 t=20 秒切斷路線，但救援仍要到 t=95 秒才完成。兩段不能並行。",
        unknown: "東閘撐架能不能承受完整的 95 秒，這段時間線沒有答案。"
      }
    },
    "2": {
      name: "救援聯絡",
      shortName: "救援",
      number: "02",
      tone: "rescue",
      eyebrow: "STAGE 02｜角色簡報｜訊號工具",
      tagline: "把人的回應帶回隊伍，也把訊號跨不過的邊界留下來。",
      duty: "逐項檢視林芮裝置回傳的來源、回應方式、時間邊界與位置資料。",
      known: ["18:47 後西側沒有確認的出口。", "林芮的穿戴裝置仍掛在西側頻道。", "主電力中斷，中央遙測無法回報。"],
      unknown: ["回應是不是即時傳送。", "林芮現在的位置與西側路線。"],
      actionKey: "signal-source-inspection",
      actionTitle: "檢視回傳訊號的四個欄位",
      actionPrompt: "每一欄都自己打開看過，不需要判定對錯；留下這個訊號能支持什麼、還缺什麼。",
      actionWhy: "你負責判讀回應的證據邊界，讓「有人回應」不被誤說成「知道她在哪裡」。",
      result: {
        source: "救援聯絡器／林芮穿戴裝置回傳",
        time: "18:48，四個訊號欄位完成檢視",
        content: "裝置簽名相符，兩點回應是有人刻意操作留下的可信連結；它沒有帶回目前位置或路線資料。",
        unknown: "停電讓我們無法判定這是即時回應或系統暫存，也無法由訊號證明西側路線現在暢通。"
      }
    },
    "3": {
      name: "結構安全",
      shortName: "安全",
      number: "03",
      tone: "safety",
      eyebrow: "STAGE 02｜角色簡報｜壓力工具",
      tagline: "把壓力前緣沿路徑推到東閘，讓物理代價不會被一句「撐住」帶過。",
      duty: "把 0–95 秒的壓力投影和高承的位置責任對齊，但不替撐架猜承載上限。",
      known: ["18:47 進水管破裂，壓力與水勢上升。", "高承仍在東閘手動撐點。", "東閘壓力線還有回波。"],
      unknown: ["壓力前緣何時抵達東閘。", "撐架能否承受完整的 95 秒。"],
      actionKey: "pressure-projection",
      actionTitle: "推進 0–95 秒壓力投影",
      actionPrompt: "用觸控標記把壓力前緣推過路徑。未到 95 秒只顯示中間位置；到達 95 秒才完成這項讀取。",
      actionWhy: "你負責把時間和物理位置接起來：高承要留在撐點，但撐架承載仍然是未知。",
      result: {
        source: "東閘壓力線／95 秒投影",
        time: "18:48，壓力投影已推到 95 秒",
        content: "壓力前緣沿東側路徑前進，在 t=95 秒抵達東閘。高承必須留在撐點，才能讓控制廊維持隔離。",
        unknown: "這項投影沒有測出撐架的確切承載上限；撐架能否撐完整的 95 秒仍未知。"
      }
    }
  };

  const judgmentOptions = [
    { key: "close", label: "立即封閉", description: "執行封閉，不再維持西側救援路線。" },
    { key: "hold", label: "維持救援窗口", description: "暫不封閉，維持 95 秒救援窗口。" },
    { key: "unsure", label: "還不能判斷", description: "目前的證據還不足以傾向任何一邊。" }
  ];

  const reconsiderationOptions = [
    { key: "changed", label: "改變了", description: "查證結果讓我的目前方向換了。" },
    { key: "unchanged", label: "沒改變", description: "查證結果補足了資訊，但我的方向不變。" },
    { key: "still-unsure", label: "我仍不確定", description: "知道更多，仍不足以讓我傾向一邊。" }
  ];

  const verificationOptions = {
    A: {
      key: "A",
      title: "西側路線掃描",
      source: "剩餘電容／西側掃描脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認林芮現在仍在西側抬高避難龕；救援推車軌道仍可通，從授權到清線需要 95 秒。",
      unknown: "東閘撐架能不能承受完整的 95 秒，這次掃描沒有測量。",
      shortKnown: "林芮仍在西側；救援軌道可通 95 秒。"
    },
    B: {
      key: "B",
      title: "東閘載重測試",
      source: "剩餘電容／東閘載重脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認東閘撐架無法承受完整的 95 秒；高承必須留在撐點，才能防止控制廊隔離閘開啟。",
      unknown: "林芮穿戴頻道的兩點回應是不是即時傳送，這次測試沒有確認。",
      shortKnown: "東閘撐架撐不住完整 95 秒；高承必須留在撐點。"
    }
  };

  const consequences = {
    "A|close": {
      decision: "立即封閉",
      next: "封閉指令現在開始，西側推車路線被切斷；高承放開東閘撐點並撤出。",
      later: "後來確認，林芮當時仍活著，在封閉障礙後等待；替代進入路線到達前，她失去生命。"
    },
    "A|hold": {
      decision: "維持 95 秒",
      next: "救援推車沿可通軌道清出西側路線把林芮帶出；壓力前緣抵達東閘。",
      later: "後來確認，高承留到控制廊隔離完成；他在東閘撐架失效中死亡。"
    },
    "B|close": {
      decision: "立即封閉",
      next: "封閉指令現在開始，西側推車路線被切斷；高承放開東閘撐點並撤出。",
      later: "後來確認，林芮當時仍活著，在封閉障礙後等待；替代進入路線到達前，她失去生命。"
    },
    "B|hold": {
      decision: "維持 95 秒",
      next: "隊伍維持東閘撐點 95 秒，讓西側推車完成清線；壓力抵達東閘，撐架在隔離完成後失效。",
      later: "後來確認，救援推車把林芮帶出；高承留到控制廊隔離完成，並在失效中死亡。"
    }
  };

  const fieldData = {
    signature: { label: "裝置簽名", kicker: "來源", detail: "回傳簽名與林芮的穿戴裝置相符。這支持「訊號確實連到她的裝置」。" },
    response: { label: "兩點回應", kicker: "內容", detail: "兩點回應的間隔像是有人刻意碰過裝置；這支持「有人主動操作過」。" },
    freshness: { label: "時間邊界", kicker: "時間", detail: "回應在事故窗口後出現，但這支鏈路無法分辨即時傳送或紀錄器暫存。" },
    route: { label: "位置／路線", kicker: "還缺的資料", detail: "封包沒有座標，也沒有西側路線是否暢通的資料。" }
  };
  const fieldKeys = Object.keys(fieldData);

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

  function defaultToolProgress(roleId) {
    if (roleId === "1") return { selectedProcess: null, alignment: { closure: null, rescue: null }, feedback: "" };
    if (roleId === "2") return { inspected: [], feedback: "" };
    if (roleId === "3") return { seconds: 0, feedback: "" };
    return {};
  }

  function defaultSeat(roleId) {
    return {
      toolProgress: defaultToolProgress(roleId),
      actionComplete: false,
      actionAt: null,
      actionKey: null,
      initialJudgment: null,
      initialJudgmentAt: null,
      initialJudgmentLocked: false,
      teamReady: false,
      teamReadyAt: null,
      reconsideration: null,
      reconsiderationAt: null,
      postVerificationReady: false,
      postVerificationReadyAt: null
    };
  }

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
      if (!raw) return { ...fallback };
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { ...fallback, ...parsed } : { ...fallback };
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
      // The prototype remains playable if browser storage is unavailable.
    }
  }

  function seatKey(roleId) {
    return `${STORAGE_PREFIX}seat:${roleId}`;
  }

  function readSeat(roleId) {
    const base = defaultSeat(roleId);
    const stored = readJson(seatKey(roleId), base);
    return {
      ...base,
      ...stored,
      toolProgress: { ...base.toolProgress, ...(stored.toolProgress || {}) }
    };
  }

  function writeSeat(roleId, value) {
    const base = defaultSeat(roleId);
    writeJson(seatKey(roleId), {
      ...base,
      ...value,
      toolProgress: { ...base.toolProgress, ...(value.toolProgress || {}) }
    });
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
    return seat.actionComplete === true && Boolean(seat.initialJudgment) && seat.teamReady === true;
  }

  function currentPostVerificationReady() {
    if (!currentRole || !currentSessionReady()) return false;
    const seat = readSeat(currentRole);
    const shared = readShared();
    return Boolean(shared.verificationConfirmed) && Boolean(seat.reconsideration) && seat.postVerificationReady === true;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function optionByKey(options, key) {
    return options.find((option) => option.key === key) || null;
  }

  function judgmentLabel(key) {
    return optionByKey(judgmentOptions, key)?.label || "尚未選擇";
  }

  function reconsiderationLabel(key) {
    return optionByKey(reconsiderationOptions, key)?.label || "尚未選擇";
  }

  function completeTool(roleId, progress) {
    const role = roleData[roleId];
    const seat = readSeat(roleId);
    writeSeat(roleId, {
      ...seat,
      toolProgress: progress,
      actionComplete: true,
      actionAt: "18:48",
      actionKey: role.actionKey
    });
  }

  function renderCommandTool(seat) {
    const progress = seat.toolProgress;
    const alignment = progress.alignment || { closure: null, rescue: null };
    const finished = seat.actionComplete;
    const active = progress.selectedProcess;
    const processLabel = active === "closure" ? "遠端封閉" : active === "rescue" ? "救援清線" : "尚未選取流程";
    const closureDone = alignment.closure === "20";
    const rescueDone = alignment.rescue === "95";
    const endpointDisabled = finished || !active;
    const feedback = progress.feedback || (active ? `現在請點「${processLabel}」在時間軌上的終點。` : "先點一段流程，再點它的終點。選錯可以重來。 ");
    return `<div class="tool-kicker">短操作｜時間線重建</div>
      <div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已完成" : "進行中"}</span></div>
      <h2 id="tool-title">${roleData["1"].actionTitle}</h2>
      <p>${roleData["1"].actionPrompt}</p>
      <div class="tool-instruction" data-command-instruction aria-live="polite"><strong>${escapeHtml(processLabel)}</strong><span>${escapeHtml(feedback)}</span></div>
      <div class="timeline-wrap" aria-label="共同 0 到 95 秒時間軌">
        <div class="timeline-labels"><span>t=0</span><span>t=20</span><span>t=95</span></div>
        <div class="timeline-track"><span class="timeline-tick tick-20" aria-hidden="true"></span><span class="timeline-end-label end-20">20 秒</span><span class="timeline-end-label end-95">95 秒</span>
          <div class="timeline-bar closure-bar ${closureDone ? "is-aligned" : "is-pending"}" style="--timeline-end: ${closureDone ? "21.05%" : "100%"}"><b>遠端封閉 20 秒</b><span>${closureDone ? "已放到 t=20" : "尚未放上時間軌"}</span></div>
          <div class="timeline-bar rescue-bar ${rescueDone ? "is-aligned" : "is-pending"}" style="--timeline-end: 100%"><b>救援清線 95 秒</b><span>${rescueDone ? "已放到 t=95" : "尚未放上時間軌"}</span></div>
        </div>
        <p class="timeline-note">${finished ? "對齊完成：封閉在 t=20 秒切斷路線，救援要到 t=95 秒才完成。" : "把兩段流程放上同一條時間軌，再看它們之間發生什麼。"}</p>
      </div>
      <div class="process-grid" role="group" aria-label="選擇要對齊的流程">
        <button type="button" class="process-choice ${active === "closure" ? "is-selected" : ""} ${closureDone ? "is-done" : ""}" data-command-process="closure" ${finished ? "disabled" : ""} aria-pressed="${active === "closure"}"><span class="choice-key">流程 1</span><strong>遠端封閉</strong><small>${closureDone ? "已對齊 t=20 秒" : "點我，再選終點"}</small></button>
        <button type="button" class="process-choice ${active === "rescue" ? "is-selected" : ""} ${rescueDone ? "is-done" : ""}" data-command-process="rescue" ${finished ? "disabled" : ""} aria-pressed="${active === "rescue"}"><span class="choice-key">流程 2</span><strong>救援清線</strong><small>${rescueDone ? "已對齊 t=95 秒" : "點我，再選終點"}</small></button>
      </div>
      <div class="endpoint-block"><span class="endpoint-heading">${active ? `請選「${escapeHtml(processLabel)}」的終點` : "選取流程後，這裡會出現可點的終點"}</span>
        <div class="endpoint-grid" role="group" aria-label="選擇流程終點">
          <button type="button" class="endpoint-choice ${alignment[active] === "20" ? "is-selected" : ""}" data-command-endpoint="20" ${endpointDisabled ? "disabled" : ""}><strong>t=20 秒</strong><small>把選取的流程放到這裡</small></button>
          <button type="button" class="endpoint-choice ${alignment[active] === "95" ? "is-selected" : ""}" data-command-endpoint="95" ${endpointDisabled ? "disabled" : ""}><strong>t=95 秒</strong><small>把選取的流程放到這裡</small></button>
        </div>
      </div>
      <p class="tool-footnote">兩段都對齊後，指揮記錄才會整理完成；選錯只會提示你換一個終點。</p>`;
  }

  function renderRescueTool(seat) {
    const progress = seat.toolProgress;
    const inspected = Array.isArray(progress.inspected) ? progress.inspected : [];
    const finished = seat.actionComplete;
    const viewedCount = inspected.length;
    const allViewed = fieldKeys.every((key) => inspected.includes(key));
    const cards = fieldKeys.map((key, index) => {
      const field = fieldData[key];
      const open = inspected.includes(key);
      return `<article class="inspect-card ${open ? "is-open" : ""}">
        <button type="button" class="inspect-button" data-inspect-field="${key}" ${finished ? "disabled" : ""} aria-expanded="${open}"><span class="field-index">0${index + 1}</span><span><strong>${field.label}</strong><small>${open ? "已查看" : "點開檢視"}</small></span><span class="inspect-mark" aria-hidden="true">${open ? "✓" : "+"}</span></button>
        <div class="inspect-detail" ${open ? "" : "hidden"}><span>${field.kicker}</span><p>${field.detail}</p></div>
      </article>`;
    }).join("");
    const feedback = progress.feedback || (allViewed ? "四個欄位都已看過；現在可以把訊號能證明與不能證明的部分說給隊伍。" : `已看 ${viewedCount}/4 個欄位。沒有正誤題，逐項看完就完成。`);
    return `<div class="tool-kicker">短操作｜訊號／來源檢視</div>
      <div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已完成" : `已看 ${viewedCount}/4`}</span></div>
      <h2 id="tool-title">${roleData["2"].actionTitle}</h2>
      <p>${roleData["2"].actionPrompt}</p>
      <div class="tool-instruction inspector-summary" data-rescue-instruction aria-live="polite"><strong>主動檢視</strong><span>${escapeHtml(feedback)}</span></div>
      <div class="inspect-grid" aria-label="四個可檢視欄位">${cards}</div>
      <p class="tool-footnote">四項都看過後，聯絡記錄才會整理完成；只要留下每欄能支持與缺少的資料。</p>`;
  }

  function renderSafetyTool(seat) {
    const progress = seat.toolProgress;
    const seconds = Math.max(0, Math.min(95, Number(progress.seconds) || 0));
    const finished = seat.actionComplete;
    const percent = (seconds / 95) * 100;
    const feedback = progress.feedback || (seconds >= 95 ? "壓力前緣已抵達東閘；高承的位置清楚，撐架承載仍未知。" : `中間投影：壓力前緣已走到 ${seconds} 秒。繼續推到 95 秒；這不是失敗。`);
    const markerButtons = [0, 20, 40, 60, 80, 95].map((value) => `<button type="button" class="marker-choice ${seconds === value ? "is-selected" : ""}" data-pressure-marker="${value}" ${finished ? "disabled" : ""}>${value} 秒</button>`).join("");
    return `<div class="tool-kicker">短操作｜壓力投影</div>
      <div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已完成" : `${seconds}/95 秒`}</span></div>
      <h2 id="tool-title">${roleData["3"].actionTitle}</h2>
      <p>${roleData["3"].actionPrompt}</p>
      <div class="tool-instruction safety-summary" data-safety-instruction aria-live="polite"><strong>${seconds >= 95 ? "東閘已對齊" : "投影中"}</strong><span>${escapeHtml(feedback)}</span></div>
      <div class="pressure-map" style="--pressure-progress: ${percent}%" role="img" aria-label="壓力前緣沿東側路徑從 0 秒推進到 95 秒的投影">
        <div class="route-line"><span class="route-start">西側</span><span class="route-mid">控制廊</span><span class="route-end">東閘</span><span class="pressure-front" aria-hidden="true"></span><span class="pressure-marker" aria-hidden="true"></span></div>
        <div class="map-caption"><span>0 秒｜事故窗口</span><strong>${seconds} 秒</strong><span>95 秒｜壓力抵達東閘</span></div>
      </div>
      <label class="range-label" for="pressure-range"><span>把時間標記推到 95 秒</span><strong>${seconds} 秒</strong></label>
      <input id="pressure-range" class="pressure-range" type="range" min="0" max="95" step="5" value="${seconds}" data-pressure-range ${finished ? "disabled" : ""} aria-valuetext="${seconds} 秒">
      <div class="marker-grid" aria-label="快速選擇時間標記">${markerButtons}</div>
      <p class="tool-footnote">不到 95 秒只呈現中間投影；高承必須留在東閘撐點，撐架承載從頭到尾都不會被這項投影猜出來。</p>`;
  }

  function renderRoleTool(roleId, seat) {
    const tool = document.querySelector("[data-role-tool]");
    if (!tool) return;
    const content = roleId === "1" ? renderCommandTool(seat) : roleId === "2" ? renderRescueTool(seat) : renderSafetyTool(seat);
    tool.innerHTML = content;
    tool.classList.toggle("tool-complete", seat.actionComplete);
  }

  function renderJudgmentChoices(seat) {
    const disabled = seat.teamReady;
    return judgmentOptions.map((option) => {
      const selected = seat.initialJudgment === option.key;
      return `<button type="button" class="judgment-choice ${selected ? "is-selected" : ""}" data-initial-judgment="${option.key}" ${disabled ? "disabled" : ""} aria-pressed="${selected}"><span class="choice-key">${option.key === "close" ? "選項 1" : option.key === "hold" ? "選項 2" : "選項 3"}</span><strong>${option.label}</strong><small>${option.description}</small></button>`;
    }).join("");
  }

  function renderOwnEvidence(roleId, seat) {
    const node = document.querySelector("[data-role-result]");
    if (!node) return;
    const role = roleData[roleId];
    if (!seat.actionComplete) {
      node.hidden = true;
      node.innerHTML = "";
      return;
    }
    node.hidden = false;
    node.innerHTML = `<div class="panel-label">STAGE 03｜證據／目前判斷</div>
      <details class="own-evidence" open><summary>重新查看我的證據</summary>
        <h2>這是你帶回隊伍的證據</h2>
        ${evidenceCard(role.result, "own-evidence-card")}
      </details>
      <div class="judgment-panel" aria-labelledby="judgment-title">
        <div class="panel-label">你目前的判斷</div>
        <h2 id="judgment-title">只看你目前掌握的資訊，你現在傾向怎麼做？</h2>
        <p class="judgment-lede">先選一個目前判斷。它不是最後決定、不是秘密，也不是投票；所有事實和這個判斷都可以在公開交換時說出來。</p>
        <div class="judgment-grid" role="group" aria-label="選擇目前判斷">${renderJudgmentChoices(seat)}</div>
        <div class="judgment-state" data-initial-judgment-state><span>${seat.teamReady ? "你一開始的判斷" : "你目前的判斷"}</span><strong>${judgmentLabel(seat.initialJudgment)}</strong><small>${seat.teamReady ? "這會留作稍後重新思考的起點。" : "公開交換前仍可重新選擇。"}</small></div>
      </div>`;
  }

  function contributionPrompts() {
    return `<div class="prompt-grid" aria-label="公開交換的自然問題">
      <div><strong>事件指揮</strong><p>你的時間線發現了什麼衝突？你現在傾向什麼？</p></div>
      <div><strong>救援聯絡</strong><p>這個訊號能證明什麼？還缺什麼？</p></div>
      <div><strong>結構安全</strong><p>95 秒會把風險推到哪裡？</p></div>
    </div>`;
  }

  function compactTeamBoard() {
    return `<div class="compact-board" aria-label="三人交換後的共同摘要">
      <div><span>指揮</span><strong>20 秒封閉會切斷 95 秒救援</strong></div>
      <div><span>救援</span><strong>林芮有可信回應；即時位置／路線未知</strong></div>
      <div><span>安全</span><strong>95 秒壓力抵達東閘；撐架承載未知</strong></div>
    </div>`;
  }

  function renderInitialJudgmentMemo(seat) {
    return `<div class="local-memory" data-initial-judgment-memory><span>你一開始的判斷</span><strong>${judgmentLabel(seat.initialJudgment)}</strong><small>只顯示在這支手機，讓你稍後對照自己是否改變。</small></div>`;
  }

  function renderSharingStage(seat) {
    if (!seat.actionComplete) {
      return `<section class="stage-block sharing-stage" aria-labelledby="sharing-title"><div class="stage-title"><span>STAGE 04</span><h2 id="sharing-title">公開交換</h2></div><p class="stage-lock">先完成這支手機的角色工具，再在上方選一個你的目前判斷。</p></section>`;
    }
    if (!seat.initialJudgment) {
      return `<section class="stage-block sharing-stage" aria-labelledby="sharing-title"><div class="stage-title"><span>STAGE 04</span><h2 id="sharing-title">公開交換</h2></div><p class="stage-lock">先完成 STAGE 03 的目前判斷，再確認你已經和隊友公開交換。</p></section>`;
    }
    if (!seat.teamReady) {
      return `<section class="stage-block sharing-stage" aria-labelledby="sharing-title"><div class="stage-title"><span>STAGE 04</span><h2 id="sharing-title">公開交換</h2></div>
        <p class="discussion-question">把三個人的發現、目前判斷和理由放在一起。所有事實都可以說；不同判斷也可以直接說。你們真正卡住的是哪個未知？</p>
        ${contributionPrompts()}
        <div class="sharing-current"><span>你現在傾向</span><strong>${judgmentLabel(seat.initialJudgment)}</strong></div>
        <button class="primary-button confirm-button" type="button" data-team-ready>已公開分享證據、判斷與理由</button>
        <p class="stage-lock">這個確認只記下這支手機已完成口頭交換；它不代替隊伍彼此說清楚。</p></section>`;
    }
    return `<section class="stage-block sharing-stage is-ready" aria-labelledby="sharing-title"><div class="stage-title"><span>STAGE 04</span><h2 id="sharing-title">公開交換完成</h2></div>
      <p class="discussion-question">三個人的發現、目前判斷與理由都已經說完。現在只把真正影響決定的未知留下來。</p>
      ${compactTeamBoard()}
      ${renderInitialJudgmentMemo(seat)}</section>`;
  }

  function renderUnknowns() {
    return `<section class="stage-block unknowns-stage" aria-labelledby="unknowns-title"><div class="stage-title"><span>STAGE 05</span><h2 id="unknowns-title">兩個關鍵未知</h2></div>
      <p class="stage-lede">把剛才的理由放在同一張桌上：事實已經可以全部分享，但這兩個未知仍會把決定往不同方向拉。</p>
      <div class="unknown-pair" aria-label="目前仍有兩個關鍵未知"><div><span>未知 A</span><strong>林芮的即時性與西側路線</strong><small>回應可信，但是不是現在傳送、路線能否走完 95 秒仍未知。</small></div><div><span>未知 B</span><strong>東閘撐點的承載</strong><small>95 秒會把壓力帶到東閘，但撐架能否撐住仍未知。</small></div></div></section>`;
  }

  function renderVerification(shared, ready) {
    const draft = ready && verificationOptions[shared.verificationDraft] ? shared.verificationDraft : null;
    const confirmed = ready && verificationOptions[shared.verificationConfirmed] ? shared.verificationConfirmed : null;
    const locked = Boolean(confirmed);
    const options = Object.values(verificationOptions).map((option) => {
      const selected = draft === option.key;
      const canKnow = option.key === "A" ? "林芮現在是否仍在西側，以及救援軌道能否走完 95 秒。" : "東閘撐架是否能承受完整 95 秒，以及高承是否必須留在撐點。";
      return `<button class="verification-option ${selected ? "is-selected" : ""}" type="button" data-verify-option="${option.key}" ${(!ready || locked) ? "disabled" : ""} aria-pressed="${selected}"><span class="choice-key">${option.key}</span><span class="choice-title">${option.title}</span><span class="choice-line"><b>可以知道</b>${canKnow}</span><span class="choice-line"><b>仍不知道</b>${option.unknown}</span></button>`;
    }).join("");
    const result = confirmed ? `<div class="verification-result" data-verification-result><div class="panel-label">查證結果｜${confirmed} 已鎖定</div><h3>${verificationOptions[confirmed].title}</h3>${evidenceCard(verificationOptions[confirmed], "verified-evidence")}</div>` : "";
    return `<section class="stage-block verification-stage" aria-labelledby="verification-title"><div class="stage-title"><span>STAGE 06</span><h2 id="verification-title">有限查證</h2></div>
      <p class="stage-lede">你們只能查一個。哪一個未知最值得現在確認？A／B 可以在確認前換，確認後只留一個結果。</p>
      <div class="verification-target"><span>選擇焦點</span><strong>哪個未知最影響你們現在的分歧或遲疑？</strong></div>
      <div class="verification-grid">${options}</div>
      <div class="draft-row"><span>查證草稿</span><strong>${draft ? verificationOptions[draft].title : "尚未選擇"}</strong><small>${locked ? "已確認，選擇已鎖定" : "可在確認前更換"}</small></div>
      <button class="primary-button confirm-button" type="button" data-verify-confirm ${(!ready || !draft || locked) ? "disabled" : ""}>${locked ? "已確認唯一查證" : "確認這次唯一查證"}</button>
      ${!ready ? `<p class="stage-lock">先完成公開交換確認，再從上方兩個未知中選一個查證。</p>` : ""}${result}</section>`;
  }

  function renderReconsideration(shared, seat, ready) {
    const confirmed = ready && verificationOptions[shared.verificationConfirmed] ? shared.verificationConfirmed : null;
    if (!confirmed) {
      return `<section class="stage-block locked-reconsideration" aria-labelledby="reconsideration-title"><div class="stage-title"><span>STAGE 07</span><h2 id="reconsideration-title">查證後重新想</h2></div><p>查證結果出現後，每個人都會先看自己的判斷有沒有變，再用一句話說明誰改變、為什麼。</p><p class="stage-lock">先完成 STAGE 06 的唯一查證。</p></section>`;
    }
    const locked = seat.postVerificationReady;
    const choices = reconsiderationOptions.map((option) => {
      const selected = seat.reconsideration === option.key;
      return `<button type="button" class="reconsideration-choice ${selected ? "is-selected" : ""}" data-reconsideration="${option.key}" ${locked ? "disabled" : ""} aria-pressed="${selected}"><span class="choice-key">${option.key === "changed" ? "選項 1" : option.key === "unchanged" ? "選項 2" : "選項 3"}</span><strong>${option.label}</strong><small>${option.description}</small></button>`;
    }).join("");
    return `<section class="stage-block reconsideration-stage" aria-labelledby="reconsideration-title"><div class="stage-title"><span>STAGE 07</span><h2 id="reconsideration-title">查證後重新想</h2></div>
      <p class="discussion-question">看到「${verificationOptions[confirmed].title}」的結果後，你的判斷有變嗎？</p>
      <div class="baseline-row"><span>你一開始的判斷</span><strong>${judgmentLabel(seat.initialJudgment)}</strong></div>
      <div class="reconsideration-grid" role="group" aria-label="選擇查證後的反思">${choices}</div>
      <div class="reconsideration-state" data-reconsideration-state><span>查證後的反思</span><strong>${reconsiderationLabel(seat.reconsideration)}</strong><small>${seat.reconsideration ? "已記下；現在說明誰改變、為什麼。" : "先選一個最符合你現在狀態的答案。"}</small></div>
      <p class="discussion-question compact-question">這次查證改變了誰的判斷？為什麼？</p>
      <button class="primary-button confirm-button" type="button" data-post-verification-ready ${(!seat.reconsideration || locked) ? "disabled" : ""}>${locked ? "已完成查證後討論" : "我們已說明誰改變、為什麼"}</button>
      <p class="stage-lock">改變或維持都可以；把原因說清楚，就能繼續。</p></section>`;
  }

  function renderDecision(shared, ready) {
    if (!ready || !shared.verificationConfirmed || !verificationOptions[shared.verificationConfirmed]) {
      return `<section class="stage-block locked-decision" aria-labelledby="decision-title"><div class="stage-title"><span>STAGE 08</span><h2 id="decision-title">共同決定</h2></div><p>先完成查證後的個人重新判斷與短討論確認，再把「立即封閉」和「維持 95 秒」放在同一張桌上。</p></section>`;
    }
    const verified = verificationOptions[shared.verificationConfirmed];
    const locked = Boolean(shared.finalConfirmed);
    const draft = shared.finalDraft;
    const closeSelected = draft === "close";
    const holdSelected = draft === "hold";
    return `<section class="stage-block decision-stage" aria-labelledby="decision-title"><div class="stage-title"><span>STAGE 08</span><h2 id="decision-title">共同決定</h2></div>
      <div class="decision-summary"><div><h3>已確認</h3><ul><li>20 秒封閉會切斷 95 秒救援；95 秒壓力會抵達東閘。</li><li>${escapeHtml(verified.shortKnown)}</li></ul></div><div><h3>仍未知</h3><ul><li>${escapeHtml(verified.unknown)}</li><li>未選的另一端不會因為這次查證自動補回來。</li></ul></div><div><h3>現在必須決定</h3><p>立即封閉，或維持 95 秒。</p></div></div>
      <div class="decision-grid"><button class="decision-choice decision-close ${closeSelected ? "is-selected" : ""}" type="button" data-final-choice="close" ${locked ? "disabled" : ""} aria-pressed="${closeSelected}"><span class="choice-key">選項 1</span><strong>立即封閉</strong><span>封住西側推車路線；高承放開東閘撐點並撤出。</span></button><button class="decision-choice decision-hold ${holdSelected ? "is-selected" : ""}" type="button" data-final-choice="hold" ${locked ? "disabled" : ""} aria-pressed="${holdSelected}"><span class="choice-key">選項 2</span><strong>維持 95 秒</strong><span>讓西側救援完成清線；高承留在東閘撐點直到隔離。</span></button></div>
      <div class="draft-row"><span>決定草稿</span><strong>${closeSelected ? "立即封閉" : holdSelected ? "維持 95 秒" : "尚未選擇"}</strong><small>${locked ? "已確認，決定已鎖定" : "可在確認前更換"}</small></div><button class="primary-button confirm-button" type="button" data-final-confirm ${(!draft || locked) ? "disabled" : ""}>${locked ? "已確認共同決定" : "確認共同決定"}</button></section>`;
  }

  function renderConsequence(shared, ready) {
    if (!ready || !shared.finalConfirmed || !shared.verificationConfirmed) return "";
    const branch = shared.consequence || consequences[`${shared.verificationConfirmed}|${shared.finalConfirmed}`];
    if (!branch) return "";
    return `<section class="stage-block consequence-stage" aria-labelledby="consequence-title"><div class="stage-title"><span>STAGE 09</span><h2 id="consequence-title">後果</h2></div><div class="consequence-grid"><div><h3>你們的決定</h3><p>${escapeHtml(branch.decision)}</p></div><div><h3>接著發生</h3><p>${escapeHtml(branch.next)}</p></div><div><h3>後來確認</h3><p>${escapeHtml(branch.later)}</p></div></div><p class="human-question">如果重來一次，你們還會做同樣的決定嗎？</p></section>`;
  }

  function renderTeamStages() {
    const target = document.querySelector("[data-team-stage]");
    if (!target) return;
    const seat = currentRole ? readSeat(currentRole) : defaultSeat(null);
    const shared = readShared();
    const ready = currentSessionReady();
    const postReady = currentPostVerificationReady();
    target.innerHTML = `<div class="team-flow">${renderSharingStage(seat)}${seat.teamReady ? renderUnknowns() : ""}${renderVerification(shared, ready)}${renderReconsideration(shared, seat, ready)}${renderDecision(shared, postReady)}${renderConsequence(shared, postReady)}<div class="team-reset"><button class="text-button" type="button" data-reset>清除本次 A4 進度</button></div></div>`;
  }

  function renderRolePage(roleId) {
    const role = roleData[roleId];
    if (!role) return;
    const seat = readSeat(roleId);
    const setText = (selector, value) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    };
    setText("[data-role-eyebrow]", role.eyebrow);
    setText("[data-role-title]", role.name);
    setText("[data-role-number]", role.number);
    setText("[data-role-tagline]", role.tagline);
    setText("[data-role-duty]", role.duty);
    setText("[data-role-action-why]", role.actionWhy);
    const known = document.querySelector("[data-role-known]");
    if (known) known.innerHTML = role.known.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const unknown = document.querySelector("[data-role-unknown]");
    if (unknown) unknown.innerHTML = role.unknown.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    renderRoleTool(roleId, seat);
    renderOwnEvidence(roleId, seat);
    renderTeamStages();
  }

  function writeToolProgress(roleId, progress, feedback) {
    const seat = readSeat(roleId);
    writeSeat(roleId, { ...seat, toolProgress: { ...seat.toolProgress, ...progress, feedback } });
  }

  function handleCommandProcess(process) {
    const seat = readSeat("1");
    if (seat.actionComplete) return;
    const progress = { ...seat.toolProgress, selectedProcess: process };
    writeToolProgress("1", progress, `現在請點「${process === "closure" ? "遠端封閉" : "救援清線"}」在共同時間軌上的正確終點。`);
    renderRolePage("1");
  }

  function handleCommandEndpoint(endpoint) {
    const seat = readSeat("1");
    if (seat.actionComplete) return;
    const progress = { ...seat.toolProgress, alignment: { ...(seat.toolProgress.alignment || {}) } };
    const process = progress.selectedProcess;
    if (!process) return;
    const expected = process === "closure" ? "20" : "95";
    if (endpoint !== expected) {
      writeToolProgress("1", progress, `這不是「${process === "closure" ? "遠端封閉" : "救援清線"}」的終點；換一個時間標記再試一次。`);
      renderRolePage("1");
      return;
    }
    progress.alignment[process] = endpoint;
    progress.selectedProcess = null;
    const complete = progress.alignment.closure === "20" && progress.alignment.rescue === "95";
    if (complete) {
      progress.feedback = "兩段都對齊：t=20 秒封閉切斷路線，但救援仍到 t=95 秒才完成。";
      completeTool("1", progress);
    } else {
      progress.feedback = `${process === "closure" ? "遠端封閉" : "救援清線"} 已對齊。再選另一段流程。`;
      writeToolProgress("1", progress, progress.feedback);
    }
    renderRolePage("1");
  }

  function handleInspect(field) {
    const seat = readSeat("2");
    if (seat.actionComplete || !fieldData[field]) return;
    const inspected = Array.isArray(seat.toolProgress.inspected) ? [...seat.toolProgress.inspected] : [];
    if (!inspected.includes(field)) inspected.push(field);
    const complete = fieldKeys.every((key) => inspected.includes(key));
    const progress = { ...seat.toolProgress, inspected };
    const feedback = complete ? "四個欄位都看過了。可信連結、有人刻意操作，但即時性與位置／路線仍未知。" : `已看 ${inspected.length}/4 個欄位；繼續打開下一欄。`;
    if (complete) {
      progress.feedback = feedback;
      completeTool("2", progress);
    } else {
      writeToolProgress("2", progress, feedback);
    }
    renderRolePage("2");
  }

  function setPressure(seconds) {
    const seat = readSeat("3");
    if (seat.actionComplete) return;
    const value = Math.max(0, Math.min(95, Math.round(Number(seconds) / 5) * 5));
    const progress = { ...seat.toolProgress, seconds: value };
    const feedback = value >= 95 ? "壓力前緣已沿路徑抵達東閘。高承位置／責任清楚；撐架承載仍未知。" : `中間投影：壓力前緣已走到 ${value} 秒。繼續推到 95 秒；這不是失敗。`;
    progress.feedback = feedback;
    if (value >= 95) completeTool("3", progress);
    else writeToolProgress("3", progress, feedback);
    renderRolePage("3");
  }

  function handleInitialJudgment(key) {
    const seat = readSeat(currentRole);
    if (!seat.actionComplete || seat.teamReady || !optionByKey(judgmentOptions, key)) return;
    writeSeat(currentRole, {
      ...seat,
      initialJudgment: key,
      initialJudgmentAt: seat.initialJudgmentAt || "18:48",
      initialJudgmentLocked: false
    });
    renderRolePage(currentRole);
  }

  function handleReconsideration(key) {
    if (!currentSessionReady()) return;
    const shared = readShared();
    const seat = readSeat(currentRole);
    if (!shared.verificationConfirmed || seat.postVerificationReady || !optionByKey(reconsiderationOptions, key)) return;
    writeSeat(currentRole, {
      ...seat,
      reconsideration: key,
      reconsiderationAt: seat.reconsiderationAt || "18:48"
    });
    renderRolePage(currentRole);
  }

  function handlePostVerificationReady() {
    if (!currentSessionReady()) return;
    const shared = readShared();
    const seat = readSeat(currentRole);
    if (!shared.verificationConfirmed || !seat.reconsideration || seat.postVerificationReady) return;
    writeSeat(currentRole, {
      ...seat,
      postVerificationReady: true,
      postVerificationReadyAt: "18:48，完成查證後討論"
    });
    renderRolePage(currentRole);
  }

  function resetPrototype() {
    const store = storage();
    if (store) {
      try {
        Object.keys(store).filter((key) => key.startsWith(STORAGE_PREFIX)).forEach((key) => store.removeItem(key));
      } catch (_error) {
        // Ignore storage errors and return to the A4 entry surface.
      }
    }
    window.location.href = "index.html";
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const reset = target.closest("[data-reset]");
    if (reset) {
      resetPrototype();
      return;
    }
    if (page !== "role" || !currentRole) return;

    const process = target.closest("[data-command-process]");
    if (process && !process.disabled) {
      handleCommandProcess(process.dataset.commandProcess);
      return;
    }
    const endpoint = target.closest("[data-command-endpoint]");
    if (endpoint && !endpoint.disabled) {
      handleCommandEndpoint(endpoint.dataset.commandEndpoint);
      return;
    }
    const inspect = target.closest("[data-inspect-field]");
    if (inspect && !inspect.disabled) {
      handleInspect(inspect.dataset.inspectField);
      return;
    }
    const marker = target.closest("[data-pressure-marker]");
    if (marker && !marker.disabled) {
      setPressure(marker.dataset.pressureMarker);
      return;
    }
    const judgment = target.closest("[data-initial-judgment]");
    if (judgment && !judgment.disabled) {
      handleInitialJudgment(judgment.dataset.initialJudgment);
      return;
    }
    const teamReady = target.closest("[data-team-ready]");
    if (teamReady && !teamReady.disabled && currentRole) {
      const seat = readSeat(currentRole);
      if (seat.actionComplete && seat.initialJudgment && !seat.teamReady) {
        writeSeat(currentRole, { ...seat, teamReady: true, initialJudgmentLocked: true, teamReadyAt: "18:48，完成公開交換確認" });
        renderRolePage(currentRole);
      }
      return;
    }
    const verifyOption = target.closest("[data-verify-option]");
    if (verifyOption && !verifyOption.disabled && currentSessionReady()) {
      const shared = readShared();
      if (!shared.verificationConfirmed) {
        writeShared({ ...shared, verificationDraft: verifyOption.dataset.verifyOption });
        renderRolePage(currentRole);
      }
      return;
    }
    const verifyConfirm = target.closest("[data-verify-confirm]");
    if (verifyConfirm && !verifyConfirm.disabled && currentSessionReady()) {
      const shared = readShared();
      if (shared.verificationDraft && !shared.verificationConfirmed && verificationOptions[shared.verificationDraft]) {
        const option = verificationOptions[shared.verificationDraft];
        writeShared({ ...shared, verificationConfirmed: option.key, verificationResult: { ...option } });
        renderRolePage(currentRole);
      }
      return;
    }
    const reconsideration = target.closest("[data-reconsideration]");
    if (reconsideration && !reconsideration.disabled) {
      handleReconsideration(reconsideration.dataset.reconsideration);
      return;
    }
    const postReady = target.closest("[data-post-verification-ready]");
    if (postReady && !postReady.disabled) {
      handlePostVerificationReady();
      return;
    }
    const finalChoice = target.closest("[data-final-choice]");
    if (finalChoice && !finalChoice.disabled && currentPostVerificationReady()) {
      const shared = readShared();
      if (shared.verificationConfirmed && !shared.finalConfirmed && ["close", "hold"].includes(finalChoice.dataset.finalChoice)) {
        writeShared({ ...shared, finalDraft: finalChoice.dataset.finalChoice });
        renderRolePage(currentRole);
      }
      return;
    }
    const finalConfirm = target.closest("[data-final-confirm]");
    if (finalConfirm && !finalConfirm.disabled && currentPostVerificationReady()) {
      const shared = readShared();
      if (shared.verificationConfirmed && shared.finalDraft && !shared.finalConfirmed) {
        const branchKey = `${shared.verificationConfirmed}|${shared.finalDraft}`;
        writeShared({ ...shared, finalConfirmed: shared.finalDraft, consequence: consequences[branchKey] });
        renderRolePage(currentRole);
      }
    }
  }

  function handleInput(event) {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (target?.matches("[data-pressure-range]")) setPressure(target.value);
  }

  function init() {
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    if (page === "role" && currentRole) renderRolePage(currentRole);
    window.MomeyA4 = { readSeat, readShared, currentSessionReady, currentPostVerificationReady, resetPrototype };
  }

  init();
})();
