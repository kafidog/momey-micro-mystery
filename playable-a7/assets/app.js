(function (global) {
  "use strict";

  var STORAGE_NAMESPACE = "momey-a7:";
  var page = document.body.getAttribute("data-page") || "entry";
  var roleId = Number(document.body.getAttribute("data-role") || 0);
  var root = document.querySelector("[data-app]");
  var DIALOGUE = global.MOMEY_A7_DIALOGUE || [];
  var DIALOGUE_BY_ID = {};
  var forcedAudioMissing = new URLSearchParams(window.location.search).get("missingAudio") === "1";
  var currentState;

  DIALOGUE.forEach(function (row) {
    DIALOGUE_BY_ID[row.DIALOGUE_ID] = row;
  });

  var INTRO_HEADINGS = [
    "一個地方",
    "林芮",
    "高承",
    "發生什麼",
    "還缺的確認",
    "看清位置",
    "兩條路",
    "你們的應變小組"
  ];

  var INTRO_PANEL_MAP = {
    1: "panel-01.webp",
    2: "panel-03.webp",
    3: "panel-04.webp",
    4: "panel-02.webp",
    5: null,
    6: null,
    7: "panel-06.webp",
    8: "panel-05.webp"
  };

  var STAGE_LABELS = {
    ROLE: "接手角色",
    CHOOSE: "協調要查什麼",
    OPERATE: "選擇要查的事",
    RESULT: "查看結果",
    DISCUSS: "交換發現",
    DECIDE: "共同決定",
    ENDING: "事件結束"
  };

  var ROLES = {
    1: {
      id: 1,
      name: "時間確認",
      duty: "查清隔離閘和救援車各要多久。",
      now: "先選一件要查的事，再按開始。",
      initialKnown: [
        "中央隔離閘在控制室和地下通道的邊界。",
        "西側救援軌道會通過中央隔離閘的開口。"
      ],
      choices: [
        { id: "O1", label: "隔離閘多久會關上？" },
        { id: "O2", label: "外側救援隊多久能到？" }
      ]
    },
    2: {
      id: 2,
      name: "林芮聯絡",
      duty: "查林芮的回應和西側救援路線。",
      now: "先選一件要查的事，再按開始。",
      initialKnown: [
        "林芮最後已知在高處避難台。",
        "她原本在西側維修隧道檢查西側救援軌道。"
      ],
      choices: [
        { id: "R1", label: "林芮現在還有回應嗎？" },
        { id: "R2", label: "西側救援軌道還能走嗎？" }
      ]
    },
    3: {
      id: 3,
      name: "高承安全",
      duty: "查危險何時到高承身邊，以及手動撐桿能撐多久。",
      now: "先選一件要查的事，再按開始。",
      initialKnown: [
        "高承在中央隔離閘東側。",
        "他現在握著手動撐桿。"
      ],
      choices: [
        { id: "S1", label: "危險多久會到高承那裡？" },
        { id: "S2", label: "高承那邊還撐得住嗎？" }
      ]
    }
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getStorage() {
    try {
      return window.localStorage;
    } catch (_error) {
      return null;
    }
  }

  function normalizedSeed() {
    var raw = new URLSearchParams(window.location.search).get("seed") || "A7-LOCAL";
    var clean = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
    return clean || "A7-LOCAL";
  }

  function seedPrefix(seed) {
    return STORAGE_NAMESPACE + seed + ":";
  }

  function stateKey(seed, kind) {
    return seedPrefix(seed) + kind;
  }

  function profileForSeed(seed) {
    var clean = String(seed || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    var hash = 2166136261;
    for (var i = 0; i < clean.length; i += 1) {
      hash ^= clean.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
  }

  function defaultEntryState(seed) {
    return {
      schema: "momey-a7-entry-v1",
      seed: seed,
      introBeat: 1,
      audioEnabled: true
    };
  }

  function defaultRoleState(seed, id) {
    return {
      schema: "momey-a7-role-v1",
      seed: seed,
      roleId: id,
      profile: profileForSeed(seed),
      stage: "ROLE",
      started: false,
      draft: null,
      confirmed: null,
      sharedOrally: false,
      decisionDraft: null,
      agreementConfirmed: false,
      decisionLocked: null,
      audioEnabled: true
    };
  }

  function saveJson(key, value) {
    var store = getStorage();
    if (!store) return;
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (_error) {
      /* A storage quota/private-mode failure never blocks the local flow. */
    }
  }

  function loadJson(key) {
    var store = getStorage();
    if (!store) return null;
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function isChoice(id, role) {
    return role.choices.some(function (choice) { return choice.id === id; });
  }

  function loadEntryState(seed) {
    var saved = loadJson(stateKey(seed, "entry"));
    if (!saved || saved.schema !== "momey-a7-entry-v1" || saved.seed !== seed) return defaultEntryState(seed);
    return {
      schema: "momey-a7-entry-v1",
      seed: seed,
      introBeat: Math.max(1, Math.min(9, Number(saved.introBeat) || 1)),
      audioEnabled: saved.audioEnabled !== false
    };
  }

  function loadRoleState(seed, id) {
    var role = ROLES[id];
    var saved = loadJson(stateKey(seed, "role-" + id));
    if (!saved || saved.schema !== "momey-a7-role-v1" || saved.seed !== seed || saved.roleId !== id) return defaultRoleState(seed, id);
    var stageNames = ["ROLE", "CHOOSE", "OPERATE", "RESULT", "DISCUSS", "DECIDE", "ENDING"];
    var clean = defaultRoleState(seed, id);
    clean.stage = stageNames.indexOf(saved.stage) >= 0 ? saved.stage : "ROLE";
    clean.started = Boolean(saved.started) || clean.stage !== "ROLE";
    clean.draft = isChoice(saved.draft, role) ? saved.draft : null;
    clean.confirmed = isChoice(saved.confirmed, role) ? saved.confirmed : null;
    clean.sharedOrally = Boolean(saved.sharedOrally);
    clean.decisionDraft = saved.decisionDraft === "close" || saved.decisionDraft === "hold" ? saved.decisionDraft : null;
    clean.agreementConfirmed = Boolean(saved.agreementConfirmed) && Boolean(clean.decisionDraft);
    clean.decisionLocked = saved.decisionLocked === "close" || saved.decisionLocked === "hold" ? saved.decisionLocked : null;
    clean.audioEnabled = saved.audioEnabled !== false;
    if (clean.decisionLocked) clean.stage = "ENDING";
    if (clean.confirmed && clean.stage === "ROLE") clean.stage = "RESULT";
    return clean;
  }

  function writeCurrentState() {
    if (!currentState) return;
    if (page === "entry") saveJson(stateKey(currentState.seed, "entry"), currentState);
    else saveJson(stateKey(currentState.seed, "role-" + roleId), currentState);
  }

  function scrollStageTop() {
    window.requestAnimationFrame(function () {
      window.scrollTo(0, 0);
    });
  }

  function currentStage(current) {
    var value = current && current.stage ? current.stage : "ROLE";
    return {
      id: value,
      label: STAGE_LABELS[value] || value,
      purpose: STAGE_LABELS[value] || value
    };
  }

  function rowById(id) {
    return DIALOGUE_BY_ID[id] || null;
  }

  function rowByTrigger(stage, trigger, profile) {
    var wanted = String(profile || "").toUpperCase();
    return DIALOGUE.find(function (row) {
      return row.STAGE === stage &&
        row.TRIGGER === trigger &&
        (row.PROFILE === "ALL" || row.PROFILE === wanted);
    }) || null;
  }

  function introRow(beat) {
    return rowById("A7_INTRO_" + String(beat).padStart(2, "0"));
  }

  function currentVoiceRow(current) {
    if (page === "entry") return current.introBeat >= 1 && current.introBeat <= 8 ? introRow(current.introBeat) : null;
    if (current.stage === "CHOOSE" || current.stage === "OPERATE") return rowById("A7_ROLE_START");
    if (current.stage === "DISCUSS") return rowById("A7_SHARE_PROMPT");
    if (current.stage === "ENDING") return rowByTrigger("ENDING", "DECISION_" + String(current.decisionLocked).toUpperCase(), current.profile);
    return null;
  }

  function voiceControls(row, enabled, includeCaption) {
    if (!row || !row.AUDIO_FILE) return "";
    var caption = includeCaption === false ? "" : "<div class=\"caption-box\"><span class=\"caption-label\">字幕</span><p data-caption>" + escapeHtml(row.CAPTION_TEXT) + "</p></div>";
    return "<section class=\"voice-panel\" aria-label=\"字幕與聲音\">" + caption + "<div class=\"voice-actions\"><button type=\"button\" class=\"secondary-button\" data-audio-toggle aria-pressed=\"" +
      enabled +
      "\">" +
      (enabled ? "聲音開" : "聲音關") +
      "</button><button type=\"button\" class=\"secondary-button\" data-replay-voice>重播這句</button></div><p class=\"audio-status\" data-audio-status>" +
      (enabled ? "字幕一直保留；聲音可隨時關閉。" : "聲音已關閉；字幕仍保留。") +
      "</p><audio data-audio preload=\"none\"></audio></section>";
  }

  function choiceMarkup(role, selected) {
    return "<div class=\"choice-list\" role=\"list\" aria-label=\"查一件事\">" +
      role.choices.map(function (choice) {
        var isSelected = choice.id === selected;
        return "<button type=\"button\" class=\"choice-card" + (isSelected ? " is-selected" : "") +
          "\" data-diagnostic=\"" + choice.id + "\" aria-pressed=\"" + isSelected + "\"><span class=\"choice-mark\" aria-hidden=\"true\">" +
          (isSelected ? "✓" : "○") +
          "</span><span>" + escapeHtml(choice.label) + "</span></button>";
      }).join("") +
      "</div>";
  }

  function roleStage(role, local) {
    return "<section class=\"stage role-stage\" data-stage=\"ROLE\" aria-labelledby=\"role-heading\"><h1 id=\"role-heading\">" +
      escapeHtml(role.name) +
      "</h1><p class=\"role-line\"><strong>【你負責】</strong>" +
      escapeHtml(role.duty) +
      "</p><p class=\"role-line\"><strong>【你現在要做】</strong>" +
      escapeHtml(role.now) +
      "</p>" +
      choiceMarkup(role, local.draft) +
      "<button type=\"button\" class=\"primary-button\" data-role-start" +
      (local.draft ? "" : " disabled") +
      ">看這一項</button></section>";
  }

  function chooseStage(role, local) {
    return "<section class=\"stage\" data-stage=\"CHOOSE\" aria-labelledby=\"choose-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.CHOOSE +
      "</p><h1 id=\"choose-heading\">你要查哪一件事？</h1><p class=\"lead\">選一件，查完再把結果告訴應變小組。</p>" +
      choiceMarkup(role, local.draft) +
      "<button type=\"button\" class=\"primary-button\" data-draft-to-operate" +
      (local.draft ? "" : " disabled") +
      ">看這一項</button></section>";
  }

  function operateStage(role, local) {
    var choice = role.choices.find(function (item) { return item.id === local.draft; });
    return "<section class=\"stage\" data-stage=\"OPERATE\" aria-labelledby=\"operate-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.OPERATE +
      "</p><h1 id=\"operate-heading\">這支手機查：</h1><div class=\"selected-question\"><span>查一件事</span><strong>" +
      escapeHtml(choice ? choice.label : "") +
      "</strong></div><p class=\"lead\">現在可以改選；確認後才會看到結果。</p><div class=\"inline-actions\"><button type=\"button\" class=\"secondary-button\" data-change-diagnostic>改選一件事</button></div><button type=\"button\" class=\"primary-button\" data-confirm-diagnostic>確認查這一件</button></section>";
  }

  function resultParts(local) {
    var row = rowByTrigger("RESULT", "DIAGNOSTIC_" + local.confirmed, local.profile);
    var text = row ? row.CAPTION_TEXT : "";
    var split = text.split("仍不知道：");
    return {
      row: row,
      found: (split[0] || "").replace(/^查到：/, "").trim(),
      unknown: (split[1] || "").trim()
    };
  }

  function resultStage(local) {
    var result = resultParts(local);
    return "<section class=\"stage result-stage\" data-stage=\"RESULT\" aria-labelledby=\"result-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.RESULT +
      "</p><h1 id=\"result-heading\">把這兩件事告訴隊友：</h1><ul class=\"result-bullets\" data-result-bullets><li><strong>查到：</strong>" +
      escapeHtml(result.found) +
      "</li><li><strong>仍不知道：</strong>" +
      escapeHtml(result.unknown) +
      "</li></ul><button type=\"button\" class=\"primary-button\" data-share-result>告訴隊友</button></section>";
  }

  function discussStage() {
    return "<section class=\"stage\" data-stage=\"DISCUSS\" aria-labelledby=\"discuss-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.DISCUSS +
      "</p><h1 id=\"discuss-heading\">我們現在知道什麼，還不知道什麼？</h1><p class=\"group-question\">請把這支手機的兩句結果說給隊友；等三個人都說完，再各自按下面的按鈕。</p><button type=\"button\" class=\"primary-button\" data-group-gate>三人都說完了</button></section>";
  }

  function decisionSummary(local) {
    var result = resultParts(local);
    return "<div class=\"decision-summary\"><p><strong>林芮</strong>：在高處避難台；西側救援軌道是她的主要救援路線。</p><p><strong>高承</strong>：在中央隔離閘東側，握著手動撐桿；海水與污染從東側靠近。</p><p><strong>中央隔離閘</strong>：20 秒內關上會保護控制室並切斷西側救援軌道供電；再開 95 秒保留救援車可能，讓高承留在手動撐桿旁。</p><p><strong>仍不知道</strong>：" +
      escapeHtml(result.unknown) +
      " <strong>本支手機查到</strong>：" +
      escapeHtml(result.found) +
      " 其他兩支手機的結果以口頭交換。</p></div>";
  }

  function decisionStage(local) {
    var selected = local.decisionDraft || "";
    var actionLabel = selected === "close" ? "執行：現在關上中央隔離閘" : selected === "hold" ? "執行：讓中央隔離閘再開 95 秒" : "先選一個共同行動";
    return "<section class=\"stage decision-stage\" data-stage=\"DECIDE\" aria-labelledby=\"decision-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.DECIDE +
      "</p><h1 id=\"decision-heading\">先說清楚，再一起選</h1>" +
      decisionSummary(local) +
      "<p class=\"lead\">兩個選項都會改變現場；確認前仍可改。</p><div class=\"decision-list\" role=\"radiogroup\" aria-label=\"共同選擇\"><button type=\"button\" class=\"decision-card" +
      (selected === "close" ? " is-selected" : "") +
      "\" data-decision=\"close\" aria-pressed=\"" +
      (selected === "close") +
      "\"><strong>現在關上中央隔離閘</strong><span>20 秒內關上，控制室受保護，高承可以撤退；西側救援軌道失去供電，林芮失去主要救援路線。</span></button><button type=\"button\" class=\"decision-card" +
      (selected === "hold" ? " is-selected" : "") +
      "\" data-decision=\"hold\" aria-pressed=\"" +
      (selected === "hold") +
      "\"><strong>讓中央隔離閘再開 95 秒</strong><span>保留救援車把林芮帶回的可能；高承要留在手動撐桿旁，海水與污染會靠近。</span></button></div><button type=\"button\" class=\"secondary-button wide\" data-agreement-confirm" +
      (selected && !local.agreementConfirmed ? "" : " disabled") +
      ">三人都確認選同一項了</button><button type=\"button\" class=\"primary-button\" data-confirm-decision" +
      (selected && local.agreementConfirmed ? "" : " disabled") +
      ">" + escapeHtml(actionLabel) + "</button></section>";
  }

  function endingStage(local) {
    var row = rowByTrigger("ENDING", "DECISION_" + String(local.decisionLocked).toUpperCase(), local.profile);
    return "<section class=\"stage ending-stage\" data-stage=\"ENDING\" aria-labelledby=\"ending-heading\"><p class=\"eyebrow\">" +
      STAGE_LABELS.ENDING +
      "</p><h1 id=\"ending-heading\">事件結束</h1><p class=\"ending-consequence\" data-consequence>" +
      escapeHtml(row ? row.CAPTION_TEXT : "") +
      "</p><button type=\"button\" class=\"primary-button\" data-reset>重新開始</button></section>";
  }

  function currentStageMarkup(role, local) {
    var stage = currentStage(local).id;
    if (stage === "ROLE") return roleStage(role, local);
    if (stage === "CHOOSE") return chooseStage(role, local);
    if (stage === "OPERATE") return operateStage(role, local);
    if (stage === "RESULT") return resultStage(local);
    if (stage === "DISCUSS") return discussStage();
    if (stage === "DECIDE") return decisionStage(local);
    return endingStage(local);
  }

  function progressMarkup(local) {
    return "<div class=\"progress-row\" data-human-progress><p><span class=\"progress-label\">現在</span><strong>" +
      escapeHtml(currentStage(local).label) +
      "</strong></p><button type=\"button\" class=\"secondary-button\" data-reference-open>查看我的資料</button></div>";
  }

  function troubleshooting() {
    return "<details class=\"troubleshooting\" data-troubleshooting><summary>疑難排解</summary><p>只在需要排查這一場時查看識別碼；正常遊玩不需要它。</p><code data-raw-seed hidden></code><button type=\"button\" class=\"secondary-button\" data-reset>重設這一場</button></details>";
  }

  function roleOperator(local) {
    return voiceControls(currentVoiceRow(local), local.audioEnabled, true);
  }

  function renderRole() {
    if (!root || !ROLES[roleId]) return;
    var role = ROLES[roleId];
    if (currentState.stage === "ROLE") {
      root.innerHTML = roleStage(role, currentState);
      return;
    }
    root.innerHTML = roleOperator(currentState) + progressMarkup(currentState) + currentStageMarkup(role, currentState) + troubleshooting();
    bindAudioElement();
  }

  function introVisual(beat) {
    if (beat === 5) {
      return "<div class=\"lost-confirmation-visual\" aria-label=\"失去確認的狀態圖\"><div class=\"lost-status\"><strong>控制室</strong><span>無法確認</span></div><div class=\"lost-status\"><strong>林芮</strong><span>狀態與路線未知</span></div><div class=\"lost-status\"><strong>高承／中央隔離閘</strong><span>安全時間未知</span></div></div>";
    }
    if (beat === 6) {
      return "<figure class=\"story-map\"><img src=\"assets/facility-map.svg\" alt=\"海岬防洪站簡圖，標出控制室、林芮、高承、中央隔離閘、西側救援軌道和海水與污染方向。\"><figcaption>海水與污染從東側靠近；西側救援軌道穿過中央隔離閘開口。</figcaption></figure>";
    }
    var panel = INTRO_PANEL_MAP[beat];
    if (!panel) return "";
    var label = "";
    if (beat === 2) label = "<span class=\"visual-label\">林芮｜維修員｜高處避難台</span>";
    if (beat === 3) label = "<span class=\"visual-label\">高承｜閘門技師｜中央隔離閘東側</span>";
    if (beat === 7) label = "<span class=\"visual-label tradeoff-label\">林芮｜救援軌道　↔　高承｜手動撐桿</span>";
    return "<figure class=\"story-image\"><img src=\"assets/storyboard/" + panel + "\" alt=\"" + escapeHtml(INTRO_HEADINGS[beat - 1]) + "\">" + label + "</figure>";
  }

  function renderIntro() {
    if (!root) return;
    if (currentState.introBeat >= 9) {
      root.innerHTML = "<section class=\"stage intro-complete\" data-intro-complete><p class=\"eyebrow\">序章完成</p><h1>現在分配三個角色</h1><p class=\"lead\">三個人各接手一支手機，查一件事；所有發現都能分享，最後一起選擇。</p><div class=\"role-links\"><a class=\"primary-button role-link\" href=\"role-1.html?seed=" +
        encodeURIComponent(currentState.seed) +
        "\">接手 時間確認</a><a class=\"primary-button role-link\" href=\"role-2.html?seed=" +
        encodeURIComponent(currentState.seed) +
        "\">接手 林芮聯絡</a><a class=\"primary-button role-link\" href=\"role-3.html?seed=" +
        encodeURIComponent(currentState.seed) +
        "\">接手 高承安全</a></div><p class=\"share-note\">請讓每個人使用自己的手機開一條角色連結。</p>" +
        troubleshooting() +
        "</section>";
      return;
    }
    var beat = currentState.introBeat;
    var row = introRow(beat);
    root.innerHTML = "<section class=\"stage intro-stage\" data-intro-beat=\"" +
      beat +
      "\" aria-labelledby=\"intro-heading\"><div class=\"intro-count\">" +
      beat +
      " / 8</div><h1 id=\"intro-heading\">" +
      escapeHtml(INTRO_HEADINGS[beat - 1]) +
      "</h1>" +
      introVisual(beat) +
      "<div class=\"intro-caption\"><p>" +
      escapeHtml(row ? row.CAPTION_TEXT : "") +
      "</p></div>" +
      voiceControls(row, currentState.audioEnabled, false) +
      "<button type=\"button\" class=\"primary-button\" data-intro-next>" +
      (beat === 8 ? "進入角色" : "繼續") +
      "</button></section>";
    bindAudioElement();
  }

  function referenceModel(role, local) {
    var model = {
      stage: local.stage,
      responsibility: role.duty,
      known: role.initialKnown.slice(),
      currentFinding: null,
      exchange: null,
      consequence: null
    };
    if (["RESULT", "DISCUSS", "DECIDE", "ENDING"].indexOf(local.stage) >= 0 && local.confirmed) {
      var result = resultParts(local);
      model.currentFinding = { found: result.found, unknown: result.unknown };
    }
    if (local.stage === "DECIDE") {
      model.exchange = "你已按下「三人都說完了」；其他兩支手機的結果由隊友口頭交換。";
    }
    if (local.stage === "ENDING" && local.decisionLocked) {
      var row = rowByTrigger("ENDING", "DECISION_" + String(local.decisionLocked).toUpperCase(), local.profile);
      model.consequence = row ? row.CAPTION_TEXT : "";
    }
    return model;
  }

  function referenceMarkup(role, local) {
    var model = referenceModel(role, local);
    var finding = model.currentFinding ?
      "<h3>已確認的查詢</h3><ul class=\"reference-list\"><li><strong>查到：</strong>" +
      escapeHtml(model.currentFinding.found) +
      "</li><li><strong>仍不知道：</strong>" +
      escapeHtml(model.currentFinding.unknown) +
      "</li></ul>" : "";
    var exchange = model.exchange ? "<p class=\"reference-status\">" + escapeHtml(model.exchange) + "</p>" : "";
    var consequence = model.consequence ? "<h3>事件結果</h3><p>" + escapeHtml(model.consequence) + "</p>" : "";
    return "<p class=\"reference-responsibility\"><strong>你負責</strong>" +
      escapeHtml(model.responsibility) +
      "</p><h3>已知資料</h3><ul class=\"reference-list\">" +
      model.known.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") +
      "</ul><figure class=\"reference-map\"><img src=\"assets/facility-map.svg\" alt=\"海岬防洪站簡圖：控制室、林芮、高承、中央隔離閘、西側救援軌道、海水與污染方向。\"><figcaption>位置簡圖：海水與污染從東側靠近；西側救援軌道穿過中央隔離閘開口。</figcaption></figure>" +
      finding + exchange + consequence +
      "<p class=\"reference-stage\">目前：" +
      escapeHtml(STAGE_LABELS[model.stage] || model.stage) +
      "</p>";
  }

  function openReference() {
    if (!ROLES[roleId] || !currentState || currentState.stage === "ROLE") return;
    var dialog = document.querySelector("[data-reference-dialog]");
    var content = dialog && dialog.querySelector("[data-reference-content]");
    if (!dialog || !content) return;
    content.innerHTML = referenceMarkup(ROLES[roleId], currentState);
    dialog.hidden = false;
    dialog.setAttribute("aria-hidden", "false");
    var close = dialog.querySelector("[data-reference-close]");
    if (close) close.focus();
  }

  function closeReference() {
    var dialog = document.querySelector("[data-reference-dialog]");
    if (!dialog) return;
    dialog.hidden = true;
    dialog.setAttribute("aria-hidden", "true");
    var content = dialog.querySelector("[data-reference-content]");
    if (content) content.innerHTML = "";
  }

  function bindAudioElement() {
    var audio = document.querySelector("[data-audio]");
    var row = currentVoiceRow(currentState);
    if (!audio || !row || !row.AUDIO_FILE) return;
    audio.src = forcedAudioMissing ? "assets/audio/kokoro-zm-010/a7_missing_clip.mp3" : row.AUDIO_FILE;
    audio.addEventListener("error", function () {
      var status = document.querySelector("[data-audio-status]");
      if (status) status.textContent = "音訊暫時無法播放，請看字幕";
    }, { once: true });
  }

  function playVoice() {
    var audio = document.querySelector("[data-audio]");
    var status = document.querySelector("[data-audio-status]");
    if (!audio || !currentState.audioEnabled) {
      if (status) status.textContent = "聲音已關閉；字幕仍保留。";
      return;
    }
    var result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(function () {
        if (status) status.textContent = "音訊暫時無法播放，請看字幕";
      });
    }
  }

  function resetCurrentSeed() {
    var store = getStorage();
    var prefix = seedPrefix(normalizedSeed());
    if (store) {
      try {
        var keys = [];
        for (var i = 0; i < store.length; i += 1) {
          var key = store.key(i);
          if (key && key.indexOf(prefix) === 0) keys.push(key);
        }
        keys.forEach(function (key) { store.removeItem(key); });
      } catch (_error) {
        /* Re-render still gives this page a fresh in-memory state. */
      }
    }
    currentState = page === "entry" ? defaultEntryState(normalizedSeed()) : defaultRoleState(normalizedSeed(), roleId);
    closeReference();
    if (page === "entry") renderIntro();
    else renderRole();
  }

  function showRawSeed(details) {
    var code = details && details.querySelector("[data-raw-seed]");
    if (code) {
      code.hidden = false;
      code.textContent = currentState.seed;
    }
  }

  function handleClick(event) {
    var target = event.target.closest("button, a");
    if (!target) return;

    if (target.matches("[data-intro-next]")) {
      currentState.introBeat = Math.min(9, currentState.introBeat + 1);
      writeCurrentState();
      renderIntro();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-role-start]")) {
      if (!currentState.draft) return;
      currentState.started = true;
      currentState.stage = "OPERATE";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-diagnostic]")) {
      var diagnostic = target.getAttribute("data-diagnostic");
      if (ROLES[roleId].choices.some(function (choice) { return choice.id === diagnostic; })) {
        currentState.draft = diagnostic;
        writeCurrentState();
        if (currentState.stage === "ROLE" || currentState.stage === "CHOOSE") renderRole();
      }
      return;
    }

    if (target.matches("[data-draft-to-operate]")) {
      if (!currentState.draft) return;
      currentState.stage = "OPERATE";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-change-diagnostic]")) {
      currentState.stage = "CHOOSE";
      currentState.draft = null;
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-confirm-diagnostic]")) {
      if (!currentState.draft) return;
      currentState.confirmed = currentState.draft;
      currentState.stage = "RESULT";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-share-result]")) {
      currentState.stage = "DISCUSS";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-group-gate]")) {
      currentState.sharedOrally = true;
      currentState.stage = "DECIDE";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-decision]")) {
      var decision = target.getAttribute("data-decision");
      if (decision === "close" || decision === "hold") {
        currentState.decisionDraft = decision;
        currentState.agreementConfirmed = false;
        writeCurrentState();
        renderRole();
      }
      return;
    }

    if (target.matches("[data-agreement-confirm]")) {
      if (!currentState.decisionDraft) return;
      currentState.agreementConfirmed = true;
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-confirm-decision]")) {
      if (!currentState.decisionDraft || !currentState.agreementConfirmed) return;
      currentState.decisionLocked = currentState.decisionDraft;
      currentState.stage = "ENDING";
      writeCurrentState();
      renderRole();
      scrollStageTop();
      return;
    }

    if (target.matches("[data-reference-open]")) {
      openReference();
      return;
    }

    if (target.matches("[data-reference-close]")) {
      closeReference();
      return;
    }

    if (target.matches("[data-audio-toggle]")) {
      currentState.audioEnabled = !currentState.audioEnabled;
      writeCurrentState();
      if (page === "entry") renderIntro();
      else renderRole();
      return;
    }

    if (target.matches("[data-replay-voice]")) {
      playVoice();
      return;
    }

    if (target.matches("[data-reset]")) {
      resetCurrentSeed();
    }
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("toggle", function (event) {
    var details = event.target.closest("details[data-troubleshooting]");
    if (details && details.open) showRawSeed(details);
  }, true);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeReference();
  });

  var seed = normalizedSeed();
  currentState = page === "entry" ? loadEntryState(seed) : loadRoleState(seed, roleId);
  if (page === "entry") renderIntro();
  else if (ROLES[roleId]) renderRole();

  global.__MOMEY_A7__ = {
    STORAGE_NAMESPACE: STORAGE_NAMESPACE,
    DIALOGUE: DIALOGUE,
    DIALOGUE_BY_ID: DIALOGUE_BY_ID,
    ROLES: ROLES,
    INTRO_PANEL_MAP: INTRO_PANEL_MAP,
    INTRO_HEADINGS: INTRO_HEADINGS,
    getState: function () { return currentState; },
    getStorageKey: function (kind, value) { return stateKey(normalizedSeed(), kind || (page === "entry" ? "entry" : "role-" + (value || roleId))); },
    profileForSeed: profileForSeed,
    currentStage: currentStage,
    currentStageMarkup: currentStageMarkup,
    roleStage: roleStage,
    referenceModel: referenceModel,
    referenceMarkup: referenceMarkup,
    introVisual: introVisual,
    openReference: openReference,
    closeReference: closeReference,
    resetCurrentSeed: resetCurrentSeed
  };
})(window);
