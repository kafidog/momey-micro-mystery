(() => {
  "use strict";

  const STORAGE_PREFIX = "momey-a5:";
  const COMMAND_KEY = `${STORAGE_PREFIX}command`;
  const page = document.body.dataset.page || "index";
  const currentRole = document.body.dataset.role || null;

  const roleData = {
    "1": {
      name: "事件指揮",
      number: "01",
      eyebrow: "STAGE 02｜角色簡報｜指揮工具",
      tagline: "把事故的先後順序排成隊伍能用的時間線。",
      duty: "整理同一個西側窗口裡，封閉和救援各自需要多久；之後只保管全隊說好的程序選擇。",
      known: ["18:47 主電力與中央遙測中斷。", "18:48 指揮記錄已接通。", "西側同時有遠端封閉與救援清線流程。"],
      unknown: ["封閉與清線的實際時間關係。", "兩段流程是否會互相切斷。"],
      actionKey: "timeline-alignment",
      actionWhy: "你能把兩段流程放進同一個西側窗口，直接看見它們如何重疊。",
      result: {
        source: "指揮記錄／共同 0–95 秒軌",
        time: "18:48，兩段流程已完成時間線對齊",
        content: "遠端封閉需要 20 秒；救援清線需要 95 秒。封閉在 t=20 秒切斷路線，但救援仍要到 t=95 秒才完成。兩段不能並行。",
        unknown: "東閘撐架能不能承受完整的 95 秒，這段時間線沒有答案。"
      }
    },
    "2": {
      name: "救援聯絡",
      number: "02",
      eyebrow: "STAGE 02｜角色簡報｜訊號工具",
      tagline: "把人的回應帶回隊伍，也把訊號跨不過的邊界留下來。",
      duty: "逐項檢視林芮裝置回傳的來源、回應方式、時間邊界與位置資料。",
      known: ["18:47 後西側沒有確認的出口。", "林芮的穿戴裝置仍掛在西側頻道。", "主電力中斷，中央遙測無法回報。"],
      unknown: ["回應是不是即時傳送。", "林芮現在的位置與西側路線。"],
      actionKey: "signal-source-inspection",
      actionWhy: "你負責判讀回應的證據邊界；若全隊授權 A，也由你執行西側掃描。",
      result: {
        source: "救援聯絡器／林芮穿戴裝置回傳",
        time: "18:48，四個訊號欄位完成檢視",
        content: "裝置簽名相符，兩點回應是有人刻意操作留下的可信連結；它沒有帶回目前位置或路線資料。",
        unknown: "停電讓我們無法判定這是即時回應或系統暫存，也無法由訊號證明西側路線現在暢通。"
      }
    },
    "3": {
      name: "結構安全",
      number: "03",
      eyebrow: "STAGE 02｜角色簡報｜壓力工具",
      tagline: "把壓力前緣沿路徑推到東閘，讓物理代價不會被一句「撐住」帶過。",
      duty: "把 0–95 秒的壓力投影和高承的位置責任對齊，但不替撐架猜承載上限。",
      known: ["18:47 進水管破裂，壓力與水勢上升。", "高承仍在東閘手動撐點。", "東閘壓力線還有回波。"],
      unknown: ["壓力前緣何時抵達東閘。", "撐架能否承受完整的 95 秒。"],
      actionKey: "pressure-projection",
      actionWhy: "你負責把時間和物理位置接起來；若全隊授權 B，也由你執行東閘測試。",
      result: {
        source: "東閘壓力線／95 秒投影",
        time: "18:48，壓力投影已推到 95 秒",
        content: "壓力前緣在 t=95 秒抵達東閘。高承必須留在撐點，才能讓控制廊維持隔離。",
        unknown: "這項投影沒有測出撐架的確切承載上限；撐架能否撐完整的 95 秒仍未知。"
      }
    }
  };

  const judgmentOptions = [
    { key: "close", label: "立即封閉", description: "執行封閉，不再維持西側救援路線。" },
    { key: "hold", label: "維持救援窗口", description: "暫不封閉，維持 95 秒救援窗口。" },
    { key: "unsure", label: "還不能判斷", description: "目前的證據還不足以傾向任何一邊。" }
  ];

  const verificationChoices = {
    A: {
      title: "西側路線掃描",
      canKnow: "林芮現在是否仍在西側，以及救援軌道能否通行。",
      remains: "東閘撐架能不能承受完整的 95 秒。",
      specialist: "救援聯絡",
      handoff: "請救援聯絡執行西側查證 A，完成後直接把結果說給全隊。"
    },
    B: {
      title: "東閘載重測試",
      canKnow: "東閘撐架能不能承受完整的 95 秒。",
      remains: "林芮目前的位置與西側路線是否可通。",
      specialist: "結構安全",
      handoff: "請結構安全執行東閘查證 B，完成後直接把結果說給全隊。"
    }
  };

  const specialistChecks = {
    A: {
      role: "2",
      title: "西側回波定位",
      gate: "只有指揮口頭宣布全隊選擇 A，才使用這次西側掃描。",
      execute: "發送西側單次掃描脈衝",
      source: "剩餘電容／西側掃描脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認林芮現在仍在西側抬高避難龕；救援推車軌道仍可通，從授權到清線需要 95 秒。",
      unknown: "東閘撐架能不能承受完整的 95 秒，這次掃描沒有測量。"
    },
    B: {
      role: "3",
      title: "東閘短載脈衝",
      gate: "只有指揮口頭宣布全隊選擇 B，才使用這次東閘測試。",
      execute: "施放東閘單次短載脈衝",
      source: "剩餘電容／東閘載重脈衝",
      time: "18:48，單次高能脈衝回傳",
      content: "確認東閘撐架無法承受完整的 95 秒；高承必須留在撐點，才能防止控制廊隔離閘開啟。",
      unknown: "林芮穿戴頻道的兩點回應是不是即時傳送，這次測試沒有確認。"
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

  const signalFields = {
    signature: ["裝置簽名", "來源", "回傳簽名與林芮的穿戴裝置相符。"],
    response: ["兩點回應", "內容", "間隔像是有人刻意碰過裝置，支持有人主動操作過。"],
    freshness: ["時間邊界", "時間", "事故後出現，但無法分辨即時傳送或紀錄器暫存。"],
    route: ["位置／路線", "還缺的資料", "封包沒有座標，也沒有西側路線是否暢通的資料。"]
  };

  const defaultCommand = {
    exchangeComplete: false,
    verificationDraft: null,
    verificationConfirmed: null,
    specialistReportHeard: false,
    finalDraft: null,
    finalConfirmed: null,
    consequence: null
  };

  function defaultProgress(roleId) {
    if (roleId === "1") return { selectedProcess: null, alignment: { closure: null, rescue: null }, feedback: "" };
    if (roleId === "2") return { inspected: [], feedback: "" };
    if (roleId === "3") return { seconds: 0, feedback: "" };
    return {};
  }

  function defaultSeat(roleId) {
    return { toolProgress: defaultProgress(roleId), actionComplete: false, ownEvidence: null, initialJudgment: null };
  }

  function defaultSpecialist(key) {
    return { authorizationArmed: false, completed: false, result: null, key };
  }

  function store() {
    try { return window.localStorage; } catch (_error) { return null; }
  }

  function readJson(key, fallback) {
    const target = store();
    if (!target) return { ...fallback };
    try {
      const parsed = JSON.parse(target.getItem(key));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { ...fallback, ...parsed } : { ...fallback };
    } catch (_error) { return { ...fallback }; }
  }

  function writeJson(key, value) {
    const target = store();
    if (!target) return;
    try { target.setItem(key, JSON.stringify(value)); } catch (_error) { /* local play continues */ }
  }

  function seatKey(roleId) { return `${STORAGE_PREFIX}seat:${roleId}`; }
  function specialistKey(key) { return `${STORAGE_PREFIX}specialist:${key}`; }

  function readSeat(roleId) {
    const base = defaultSeat(roleId);
    const saved = readJson(seatKey(roleId), base);
    return { ...base, ...saved, toolProgress: { ...base.toolProgress, ...(saved.toolProgress || {}) } };
  }

  function writeSeat(roleId, seat) { writeJson(seatKey(roleId), seat); }
  function readCommand() { return readJson(COMMAND_KEY, defaultCommand); }
  function writeCommand(command) { writeJson(COMMAND_KEY, { ...defaultCommand, ...command }); }
  function readSpecialist(key) { return readJson(specialistKey(key), defaultSpecialist(key)); }
  function writeSpecialist(key, state) { writeJson(specialistKey(key), { ...defaultSpecialist(key), ...state }); }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function evidenceCard(evidence, className = "") {
    return `<div class="evidence-card ${className}"><dl class="evidence-list">
      <div><dt>來源</dt><dd>${escapeHtml(evidence.source)}</dd></div>
      <div><dt>時間</dt><dd>${escapeHtml(evidence.time)}</dd></div>
      <div><dt>內容</dt><dd>${escapeHtml(evidence.content)}</dd></div>
      <div><dt>還不能確定</dt><dd>${escapeHtml(evidence.unknown)}</dd></div>
    </dl></div>`;
  }

  function judgmentLabel(key) { return judgmentOptions.find((option) => option.key === key)?.label || "尚未選擇"; }

  function completeTool(roleId, progress) {
    const seat = readSeat(roleId);
    writeSeat(roleId, { ...seat, toolProgress: progress, actionComplete: true, ownEvidence: roleData[roleId].result });
  }

  function renderCommandTool(seat) {
    const progress = seat.toolProgress;
    const alignment = progress.alignment || { closure: null, rescue: null };
    const closureDone = alignment.closure === "20";
    const rescueDone = alignment.rescue === "95";
    const active = progress.selectedProcess;
    const finished = seat.actionComplete;
    const activeLabel = active === "closure" ? "遠端封閉" : active === "rescue" ? "救援清線" : "尚未選取流程";
    return `<div class="tool-kicker">短操作｜時間線重建</div>
      <div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已對齊" : "進行中"}</span></div>
      <h2 id="tool-title">重建 0–95 秒時間線</h2>
      <p>先點一段流程，再點它在共同時間軌上的正確終點。選錯可以重來。</p>
      <div class="tool-instruction" data-command-instruction aria-live="polite"><strong>${activeLabel}</strong><span>${escapeHtml(progress.feedback || (active ? `現在選「${activeLabel}」的終點。` : "先選一段流程。"))}</span></div>
      <div class="timeline-wrap"><div class="timeline-labels"><span>t=0</span><span>t=20</span><span>t=95</span></div><div class="timeline-track">
        <div class="timeline-bar closure-bar ${closureDone ? "is-aligned" : "is-pending"}" style="--timeline-end:${closureDone ? "21.05%" : "100%"}"><b>遠端封閉 20 秒</b><span>${closureDone ? "已放到 t=20" : "尚未對齊"}</span></div>
        <div class="timeline-bar rescue-bar ${rescueDone ? "is-aligned" : "is-pending"}" style="--timeline-end:100%"><b>救援清線 95 秒</b><span>${rescueDone ? "已放到 t=95" : "尚未對齊"}</span></div>
      </div></div>
      <div class="process-grid"><button type="button" class="process-choice ${active === "closure" ? "is-selected" : ""}" data-command-process="closure" ${finished ? "disabled" : ""}><strong>遠端封閉</strong><small>${closureDone ? "已對齊 t=20" : "點我，再選終點"}</small></button><button type="button" class="process-choice ${active === "rescue" ? "is-selected" : ""}" data-command-process="rescue" ${finished ? "disabled" : ""}><strong>救援清線</strong><small>${rescueDone ? "已對齊 t=95" : "點我，再選終點"}</small></button></div>
      <div class="endpoint-grid"><button type="button" class="endpoint-choice" data-command-endpoint="20" ${finished || !active ? "disabled" : ""}><strong>t=20 秒</strong></button><button type="button" class="endpoint-choice" data-command-endpoint="95" ${finished || !active ? "disabled" : ""}><strong>t=95 秒</strong></button></div>`;
  }

  function renderRescueTool(seat) {
    const inspected = Array.isArray(seat.toolProgress.inspected) ? seat.toolProgress.inspected : [];
    const finished = seat.actionComplete;
    return `<div class="tool-kicker">短操作｜訊號／來源檢視</div><div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已完成" : `已看 ${inspected.length}/4`}</span></div>
      <h2 id="tool-title">檢視回傳訊號的四個欄位</h2><p>逐項打開看過，留下這個訊號能支持什麼、還缺什麼。</p>
      <div class="inspect-grid">${Object.entries(signalFields).map(([key, field], index) => {
        const open = inspected.includes(key);
        return `<article class="inspect-card ${open ? "is-open" : ""}"><button type="button" class="inspect-button" data-inspect-field="${key}" ${finished ? "disabled" : ""} aria-expanded="${open}"><span class="field-index">0${index + 1}</span><span><strong>${field[0]}</strong><small>${open ? "已查看" : "點開檢視"}</small></span><span>${open ? "✓" : "+"}</span></button><div class="inspect-detail" ${open ? "" : "hidden"}><span>${field[1]}</span><p>${field[2]}</p></div></article>`;
      }).join("")}</div>`;
  }

  function renderSafetyTool(seat) {
    const seconds = Math.max(0, Math.min(95, Number(seat.toolProgress.seconds) || 0));
    const finished = seat.actionComplete;
    return `<div class="tool-kicker">短操作｜壓力投影</div><div class="console-topline"><div class="panel-label">你的操作</div><span class="console-state ${finished ? "is-complete" : ""}">${finished ? "已完成" : `${seconds}/95 秒`}</span></div>
      <h2 id="tool-title">推進 0–95 秒壓力投影</h2><p>把壓力前緣推到 95 秒，讀出它何時抵達東閘。</p>
      <div class="pressure-map" style="--pressure-progress:${(seconds / 95) * 100}%"><div class="pressure-track"><span class="pressure-fill"></span><span class="pressure-marker"></span></div><div class="pressure-labels"><span>破裂點</span><strong>${seconds} 秒</strong><span>東閘</span></div></div>
      <input class="pressure-range" type="range" min="0" max="95" step="5" value="${seconds}" data-pressure-range ${finished ? "disabled" : ""} aria-label="壓力投影秒數">
      <div class="marker-grid">${[0, 20, 40, 60, 80, 95].map((value) => `<button type="button" class="marker-choice ${seconds === value ? "is-selected" : ""}" data-pressure-marker="${value}" ${finished ? "disabled" : ""}>${value} 秒</button>`).join("")}</div>`;
  }

  function renderRoleTool(roleId, seat) {
    const node = document.querySelector("[data-role-tool]");
    if (!node) return;
    node.innerHTML = roleId === "1" ? renderCommandTool(seat) : roleId === "2" ? renderRescueTool(seat) : renderSafetyTool(seat);
  }

  function renderJudgmentChoices(seat) {
    return `<div class="judgment-grid" role="group" aria-label="你目前的判斷">${judgmentOptions.map((option) => `<button type="button" class="judgment-choice ${seat.initialJudgment === option.key ? "is-selected" : ""}" data-initial-judgment="${option.key}" aria-pressed="${seat.initialJudgment === option.key}"><strong>${option.label}</strong><small>${option.description}</small></button>`).join("")}</div>`;
  }

  function renderOwnEvidence(roleId, seat) {
    const node = document.querySelector("[data-role-result]");
    if (!node) return;
    if (!seat.actionComplete) { node.hidden = true; node.innerHTML = ""; return; }
    node.hidden = false;
    node.innerHTML = `<div class="panel-label">STAGE 03｜證據／目前判斷</div><h2>這是你帶回隊伍的證據</h2>${evidenceCard(roleData[roleId].result)}
      <div class="judgment-panel"><h3>你目前的判斷</h3><p>先從自己的證據出發。這不是最後決定、不是秘密，也不是投票；等一下可以把它和理由都說出來。</p>${renderJudgmentChoices(seat)}<div class="judgment-state" data-initial-judgment-state><span>目前傾向</span><strong>${judgmentLabel(seat.initialJudgment)}</strong></div></div>`;
  }

  function compactBoard() {
    return `<div class="compact-board" aria-label="事故事實速記"><div><span>時間衝突</span><strong>20 秒封閉會切斷 95 秒救援</strong></div><div><span>西側</span><strong>林芮有可信回應；目前位置與路線仍未知</strong></div><div><span>東閘</span><strong>95 秒壓力抵達；撐架承載仍未知</strong></div></div>`;
  }

  function renderVerification(command) {
    const locked = Boolean(command.verificationConfirmed);
    const draft = command.verificationDraft;
    return `<section class="stage-block verification-stage" aria-labelledby="verification-title"><div class="stage-title"><span>STAGE 05</span><h2 id="verification-title">只能查一件事</h2></div><p>全隊先說好要查哪個未知；指揮只負責把那一項按下去。</p>
      <div class="verification-grid">${Object.entries(verificationChoices).map(([key, choice]) => `<button type="button" class="verification-option ${draft === key ? "is-selected" : ""}" data-verify-option="${key}" ${locked ? "disabled" : ""} aria-pressed="${draft === key}"><span class="choice-key">${key}</span><strong>${choice.title}</strong><span><b>可以知道</b>${choice.canKnow}</span><span><b>仍不知道</b>${choice.remains}</span></button>`).join("")}</div>
      <div class="draft-row"><span>全隊查證草稿</span><strong>${draft ? `${draft}｜${verificationChoices[draft].title}` : "尚未選擇"}</strong><small>${locked ? "已鎖定" : "確認前可以改選"}</small></div>
      <button class="primary-button" type="button" data-verify-confirm ${!draft || locked ? "disabled" : ""}>${locked ? "查證授權已鎖定" : "這是三人同意要查的項目"}</button>
      ${locked ? `<div class="handoff-card" data-command-handoff><div class="panel-label">口頭交接｜${command.verificationConfirmed}</div><h3>${verificationChoices[command.verificationConfirmed].handoff}</h3><p>詳細回傳只在執行查證的專員手上；請專員直接向全隊報告。</p><button class="primary-button" type="button" data-report-heard ${command.specialistReportHeard ? "disabled" : ""}>${command.specialistReportHeard ? "已收到專員口頭回報" : `已聽到${verificationChoices[command.verificationConfirmed].specialist}向全隊報告`}</button></div>` : ""}</section>`;
  }

  function renderDecision(command) {
    if (!command.specialistReportHeard || !command.verificationConfirmed) return "";
    const choice = verificationChoices[command.verificationConfirmed];
    const locked = Boolean(command.finalConfirmed);
    return `<section class="stage-block decision-stage" aria-labelledby="decision-title"><div class="stage-title"><span>STAGE 07</span><h2 id="decision-title">執行全隊最後決定</h2></div>
      <p class="discussion-question">有人改變看法嗎？為什麼？專員已把查證結果口頭報告給全隊。</p>
      <div class="final-summary"><div><span>已確認</span><p>三人的原始證據已公開；授權的${choice.specialist}已向全隊說明 ${command.verificationConfirmed} 查證。</p></div><div><span>仍未知</span><p>${choice.remains}</p></div></div>
      <div class="alpha-prompt"><strong>最後按下前</strong><p>先讓救援與安全各說一句：支持哪個選擇，為什麼。指揮只按全隊最後說好的選項。</p></div>
      <div class="panel-label">現在必須決定</div><div class="decision-grid"><button type="button" class="decision-choice ${command.finalDraft === "close" ? "is-selected" : ""}" data-final-choice="close" ${locked ? "disabled" : ""}><strong>立即封閉</strong><span>切斷西側推車路線；高承撤出東閘。</span></button><button type="button" class="decision-choice ${command.finalDraft === "hold" ? "is-selected" : ""}" data-final-choice="hold" ${locked ? "disabled" : ""}><strong>維持 95 秒</strong><span>讓西側救援完成；高承留守東閘。</span></button></div>
      <div class="draft-row"><span>全隊決定草稿</span><strong>${command.finalDraft ? judgmentLabel(command.finalDraft) : "尚未選擇"}</strong><small>${locked ? "已鎖定" : "確認前可以改選"}</small></div><button class="primary-button" type="button" data-final-confirm ${!command.finalDraft || locked ? "disabled" : ""}>${locked ? "共同決定已執行" : "這是三人共同決定"}</button></section>`;
  }

  function renderConsequence(command) {
    if (!command.consequence || !command.finalConfirmed) return "";
    return `<section class="stage-block consequence-stage" aria-labelledby="consequence-title"><div class="stage-title"><span>STAGE 08</span><h2 id="consequence-title">一起看結果</h2></div><div class="consequence-grid"><div><h3>你們的決定</h3><p>${escapeHtml(command.consequence.decision)}</p></div><div><h3>接著發生</h3><p>${escapeHtml(command.consequence.next)}</p></div><div><h3>後來確認</h3><p>${escapeHtml(command.consequence.later)}</p></div></div><p class="human-question">如果再回到 18:48，你們還會做同樣的決定嗎？</p></section>`;
  }

  function renderCommandStages(seat) {
    const command = readCommand();
    if (!seat.actionComplete || !seat.initialJudgment) return `<div class="panel stage-placeholder"><div class="panel-label">公開交換</div><h2>先完成工具，形成自己的目前判斷</h2></div>`;
    const exchange = `<section class="stage-block sharing-stage"><div class="stage-title"><span>STAGE 04</span><h2>三人當面交換</h2></div><p>依序說：你的發現、目前傾向、理由、還不確定什麼。所有相關事實都可以分享。</p><button class="primary-button" type="button" data-exchange-complete ${command.exchangeComplete ? "disabled" : ""}>${command.exchangeComplete ? "三人的證據與目前判斷都已說完" : "三人的證據與目前判斷都已說完"}</button>${command.exchangeComplete ? compactBoard() : ""}</section>`;
    return `<div class="team-flow">${exchange}${command.exchangeComplete ? renderVerification(command) : ""}${renderDecision(command)}${renderConsequence(command)}<div class="team-reset"><button class="text-button" type="button" data-reset>清除本次 A5 進度</button></div></div>`;
  }

  function renderSpecialistStage(roleId, seat) {
    if (!seat.actionComplete || !seat.initialJudgment) return `<div class="panel stage-placeholder"><div class="panel-label">公開交換</div><h2>先完成工具，形成自己的目前判斷</h2></div>`;
    const key = roleId === "2" ? "A" : "B";
    const check = specialistChecks[key];
    const state = readSpecialist(key);
    const gate = state.completed ? evidenceCard(state.result, "verified-evidence") : state.authorizationArmed ? `<div class="authorization-gate is-armed"><strong>查證 ${key} 待命</strong><p>再聽一次指揮口令。若全隊選的不是 ${key}，現在返回；只有下一步會用掉診斷脈衝。</p><div class="gate-actions"><button type="button" class="text-button" data-specialist-cancel="${key}">返回，不執行</button><button type="button" class="primary-button" data-specialist-execute="${key}">${check.execute}</button></div></div>` : `<div class="authorization-gate"><strong>${check.gate}</strong><p>先聽指揮宣布。這一步只做最後核對，不會啟動診斷脈衝。</p><button type="button" class="primary-button" data-specialist-arm="${key}">核對：全隊授權查 ${key}</button></div>`;
    return `<div class="team-flow"><section class="stage-block sharing-stage"><div class="stage-title"><span>STAGE 04</span><h2>把你的資訊交給隊伍</h2></div><p>先說你的發現，再說你現在傾向哪邊。保留這份證據，討論時可以回看。</p></section><section class="stage-block specialist-stage" data-specialist-stage="${key}"><div class="stage-title"><span>STAGE 06｜專員 ${key}</span><h2>${check.title}</h2></div>${gate}${state.completed ? `<p class="report-callout">把上面的結果完整說給全隊。有人改變看法嗎？為什麼？</p>` : ""}</section><section class="stage-block role-end"><h2>最後資訊交給隊伍</h2><p>保留證據供討論。最後由事件指揮依全隊說好的選項執行，大家一起看結果。</p></section><div class="team-reset"><button class="text-button" type="button" data-reset>清除本次 A5 進度</button></div></div>`;
  }

  function renderTeamStages() {
    const target = document.querySelector("[data-team-stage]");
    if (!target || !currentRole) return;
    const seat = readSeat(currentRole);
    target.innerHTML = currentRole === "1" ? renderCommandStages(seat) : renderSpecialistStage(currentRole, seat);
  }

  function renderRolePage(roleId) {
    const role = roleData[roleId];
    const seat = readSeat(roleId);
    document.querySelector("[data-role-eyebrow]").textContent = role.eyebrow;
    document.querySelector("[data-role-title]").textContent = role.name;
    document.querySelector("[data-role-number]").textContent = role.number;
    document.querySelector("[data-role-tagline]").textContent = role.tagline;
    document.querySelector("[data-role-duty]").textContent = role.duty;
    document.querySelector("[data-role-action-why]").textContent = role.actionWhy;
    document.querySelector("[data-role-known]").innerHTML = role.known.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    document.querySelector("[data-role-unknown]").innerHTML = role.unknown.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    renderRoleTool(roleId, seat);
    renderOwnEvidence(roleId, seat);
    renderTeamStages();
  }

  function rerender() { if (page === "role" && currentRole) renderRolePage(currentRole); }

  function handleCommandProcess(process) {
    const seat = readSeat("1");
    if (seat.actionComplete || !["closure", "rescue"].includes(process)) return;
    writeSeat("1", { ...seat, toolProgress: { ...seat.toolProgress, selectedProcess: process, feedback: "現在選正確終點。" } });
    rerender();
  }

  function handleCommandEndpoint(endpoint) {
    const seat = readSeat("1");
    const active = seat.toolProgress.selectedProcess;
    if (seat.actionComplete || !active || !["20", "95"].includes(endpoint)) return;
    const expected = active === "closure" ? "20" : "95";
    const alignment = { ...(seat.toolProgress.alignment || {}) };
    if (endpoint !== expected) {
      writeSeat("1", { ...seat, toolProgress: { ...seat.toolProgress, feedback: `${active === "closure" ? "遠端封閉" : "救援清線"}不是 ${endpoint} 秒；換一個終點。` } });
      rerender(); return;
    }
    alignment[active] = endpoint;
    const progress = { ...seat.toolProgress, selectedProcess: null, alignment, feedback: "這段已對齊；再處理另一段。" };
    if (alignment.closure === "20" && alignment.rescue === "95") completeTool("1", progress);
    else writeSeat("1", { ...seat, toolProgress: progress });
    rerender();
  }

  function handleInspect(field) {
    const seat = readSeat("2");
    if (seat.actionComplete || !signalFields[field]) return;
    const inspected = [...new Set([...(seat.toolProgress.inspected || []), field])];
    const progress = { ...seat.toolProgress, inspected };
    if (inspected.length === Object.keys(signalFields).length) completeTool("2", progress);
    else writeSeat("2", { ...seat, toolProgress: progress });
    rerender();
  }

  function setPressure(value) {
    const seat = readSeat("3");
    if (seat.actionComplete) return;
    const seconds = Math.max(0, Math.min(95, Number(value) || 0));
    const progress = { ...seat.toolProgress, seconds };
    if (seconds >= 95) completeTool("3", progress);
    else writeSeat("3", { ...seat, toolProgress: progress });
    rerender();
  }

  function resetA5() {
    const target = store();
    if (target) Object.keys(target).filter((key) => key.startsWith(STORAGE_PREFIX)).forEach((key) => target.removeItem(key));
    window.location.href = "index.html";
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-reset]")) { resetA5(); return; }
    if (target.disabled) return;
    if (target.matches("[data-command-process]")) { handleCommandProcess(target.dataset.commandProcess); return; }
    if (target.matches("[data-command-endpoint]")) { handleCommandEndpoint(target.dataset.commandEndpoint); return; }
    if (target.matches("[data-inspect-field]")) { handleInspect(target.dataset.inspectField); return; }
    if (target.matches("[data-pressure-marker]")) { setPressure(target.dataset.pressureMarker); return; }
    if (target.matches("[data-initial-judgment]") && currentRole) {
      const key = target.dataset.initialJudgment;
      const seat = readSeat(currentRole);
      if (seat.actionComplete && judgmentOptions.some((option) => option.key === key)) writeSeat(currentRole, { ...seat, initialJudgment: key });
      rerender(); return;
    }
    if (target.matches("[data-exchange-complete]") && currentRole === "1") {
      const seat = readSeat("1");
      const command = readCommand();
      if (seat.actionComplete && seat.initialJudgment && !command.exchangeComplete) writeCommand({ ...command, exchangeComplete: true });
      rerender(); return;
    }
    if (target.matches("[data-verify-option]") && currentRole === "1") {
      const command = readCommand();
      const key = target.dataset.verifyOption;
      if (command.exchangeComplete && !command.verificationConfirmed && verificationChoices[key]) writeCommand({ ...command, verificationDraft: key });
      rerender(); return;
    }
    if (target.matches("[data-verify-confirm]") && currentRole === "1") {
      const command = readCommand();
      if (command.exchangeComplete && command.verificationDraft && !command.verificationConfirmed) writeCommand({ ...command, verificationConfirmed: command.verificationDraft });
      rerender(); return;
    }
    if (target.matches("[data-report-heard]") && currentRole === "1") {
      const command = readCommand();
      if (command.verificationConfirmed && !command.specialistReportHeard) writeCommand({ ...command, specialistReportHeard: true });
      rerender(); return;
    }
    if (target.matches("[data-final-choice]") && currentRole === "1") {
      const command = readCommand();
      const key = target.dataset.finalChoice;
      if (command.specialistReportHeard && !command.finalConfirmed && ["close", "hold"].includes(key)) writeCommand({ ...command, finalDraft: key });
      rerender(); return;
    }
    if (target.matches("[data-final-confirm]") && currentRole === "1") {
      const command = readCommand();
      if (command.specialistReportHeard && command.verificationConfirmed && command.finalDraft && !command.finalConfirmed) {
        const branch = consequences[`${command.verificationConfirmed}|${command.finalDraft}`];
        writeCommand({ ...command, finalConfirmed: command.finalDraft, consequence: branch });
      }
      rerender(); return;
    }
    if (target.matches("[data-specialist-arm]") && currentRole) {
      const key = target.dataset.specialistArm;
      const check = specialistChecks[key];
      if (check?.role === currentRole) {
        const state = readSpecialist(key);
        if (!state.completed) writeSpecialist(key, { ...state, authorizationArmed: true });
      }
      rerender(); return;
    }
    if (target.matches("[data-specialist-cancel]") && currentRole) {
      const key = target.dataset.specialistCancel;
      const check = specialistChecks[key];
      if (check?.role === currentRole) {
        const state = readSpecialist(key);
        if (!state.completed) writeSpecialist(key, { ...state, authorizationArmed: false });
      }
      rerender(); return;
    }
    if (target.matches("[data-specialist-execute]") && currentRole) {
      const key = target.dataset.specialistExecute;
      const check = specialistChecks[key];
      const state = readSpecialist(key);
      if (check?.role === currentRole && state.authorizationArmed && !state.completed) writeSpecialist(key, { ...state, completed: true, result: { source: check.source, time: check.time, content: check.content, unknown: check.unknown } });
      rerender();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-pressure-range]")) setPressure(event.target.value);
  });

  if (page === "role" && roleData[currentRole]) renderRolePage(currentRole);

  window.MomeyA5 = Object.freeze({ STORAGE_PREFIX, roleData, verificationChoices, specialistChecks, consequences });
})();
