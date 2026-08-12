(function () {
  "use strict";

  var VERSION = "momey-a6r:";
  var page = document.body.dataset.page || "index";
  var roleId = document.body.dataset.role || null;

  var ROLES = {
    "1": {
      number: "01",
      name: "作業時序",
      english: "OPERATIONS / TIMING",
      tagline: "把封閉、救援與替代程序放進同一個事件時鐘。",
      duty: "釐清程序需要多久，以及一個程序會切斷什麼。",
      known: ["遠端封閉與西側救援共用一段控制鏈。", "主系統中斷後，只剩備援程序記錄。"],
      unknown: ["兩段程序的確切時間衝突。", "替代進入能否趕上現場窗口。"],
      options: [
        { key: "O1", title: "比對封閉／救援時序", question: "兩段程序何時完成？會不會互相切斷？", canKnow: "20 秒封閉與救援窗口的直接衝突。", remains: "替代進入何時能到。" },
        { key: "O2", title: "查備援進入程序", question: "如果現在封閉，替代小組多久能抵達？", canKnow: "替代進入時間與現場生存窗口。", remains: "西側主路徑現在能否通行。" }
      ]
    },
    "2": {
      number: "02",
      name: "救援聯絡",
      english: "RESCUE / CONTACT",
      tagline: "判讀人的回應，也留下訊號跨不過的邊界。",
      duty: "釐清林芮的訊號與西側撤離路徑，但不把訊號當成完整位置證明。",
      known: ["林芮的穿戴頻道仍有兩點回傳。", "西側沒有已確認的出口紀錄。"],
      unknown: ["回傳是不是當下發出。", "救援推車目前能否抵達她。"],
      options: [
        { key: "R1", title: "解析訊號新鮮度", question: "兩點回應何時產生？是即時還是緩衝封包？", canKnow: "訊號的時間邊界與主動操作證據。", remains: "西側路徑是否可通。" },
        { key: "R2", title: "掃描西側撤離路徑", question: "推車能否通過？抵達與撤離需要多久？", canKnow: "路徑狀態與救援時間。", remains: "兩點回應是否代表林芮現在的位置。" }
      ]
    },
    "3": {
      number: "03",
      name: "結構安全",
      english: "SAFETY / STRUCTURE",
      tagline: "把壓力、撐架與留守者的暴露放進同一張圖。",
      duty: "釐清東閘何時受衝擊，以及撐架和工作站能提供多少保護。",
      known: ["高承仍在東閘手動撐點。", "壓力與污染沿東側路徑逼近。"],
      unknown: ["前緣何時抵達。", "撐架與呼吸防護能否撐過 95 秒。"],
      options: [
        { key: "S1", title: "投影壓力／污染前緣", question: "前緣何時抵達東閘？峰值落在哪裡？", canKnow: "東閘受衝擊的時間窗口。", remains: "撐架與工作站實際餘裕。" },
        { key: "S2", title: "檢查撐架／工作站餘裕", question: "結構與呼吸防護能撐過 95 秒嗎？", canKnow: "撐架承載與留守者保護狀態。", remains: "前緣精確抵達時間。" }
      ]
    }
  };

  var PROFILES = {
    breakline: {
      results: {
        O1: { found: "遠端封閉在 t=20 秒完成；救援推車要到 t=95 秒完成撤離。封閉會切斷推車控制鏈。", means: "兩段程序不能同時完成。", unknown: "替代進入何時能抵達林芮。" },
        O2: { found: "封閉後，替代小組最快 11 分鐘進入；西側避難龕的可存活窗口少於 7 分鐘。", means: "封閉後的替代進入趕不上現場窗口。", unknown: "主救援軌目前是否可通。" },
        R1: { found: "兩點回應在 4 秒前直接寫入，裝置簽名相符，沒有緩衝轉送標記。", means: "事故接手時有人仍在主動操作林芮的裝置。", unknown: "她的精確位置與路徑。" },
        R2: { found: "回波定位到西側高位避難龕；推車軌可通，撤離需要 92–95 秒。", means: "維持控制鏈可完成西側撤離。", unknown: "東閘能否承受完整窗口。" },
        S1: { found: "壓力前緣在 t=72 秒抵達東閘，峰值在 t=83 秒通過手動撐點。", means: "高承會在救援完成前承受峰值。", unknown: "撐架能承受多久。" },
        S2: { found: "撐架已有裂損；模型在 t=76–83 秒失效。高承必須留守，隔離閘才不會提前開啟。", means: "維持 95 秒會超過結構餘裕。", unknown: "林芮目前是否仍在可救路徑上。" }
      },
      consequences: {
        close: { decision: "立即封閉", next: "t=20 秒，西側推車控制鏈被切斷；高承放開撐點並撤出東閘。", later: "替代小組 11 分鐘後抵達。林芮當時仍在高位避難龕，但已失去生命。" },
        hold: { decision: "維持 95 秒救援窗口", next: "t=94 秒，推車把林芮帶出西側；壓力峰值已越過東閘撐點。", later: "林芮存活。高承留到控制廊完成隔離，並在撐架失效中死亡。" }
      }
    },
    backwash: {
      results: {
        O1: { found: "遠端封閉在 t=20 秒完成；低速救援程序要到 t=92 秒完成。封閉會切斷推車控制鏈。", means: "兩段程序仍然互斥，但救援可在 95 秒內完成。", unknown: "替代進入與避難龕空氣窗口。" },
        O2: { found: "封閉後，替代小組約 4 分鐘抵達；避難龕安全空氣在約 3 分鐘降到臨界。", means: "替代進入能救出林芮，但可能晚於無傷窗口。", unknown: "主救援軌現在能否通行。" },
        R1: { found: "兩點回應由斷電緩衝器延遲 41 秒送出；簽名相符，但沒有當下位置。", means: "回應可信，卻不能證明林芮在 18:48 的位置。", unknown: "西側路徑與她目前是否仍可接近。" },
        R2: { found: "西側低速路徑可通；推車可在 t=89 秒抵達並於 t=92 秒完成撤離。", means: "維持窗口可在避難龕空氣降到臨界前撤離。", unknown: "訊號是否為當下回應。" },
        S1: { found: "污染前緣在 t=84 秒抵達東閘；結構壓力峰值預計在 t=98 秒後。", means: "95 秒內主要風險是留守者暴露，不是撐架崩潰。", unknown: "工作站呼吸防護是否完整。" },
        S2: { found: "撐架可承受 105–110 秒；高承的呼吸防護密封受損，t=84 秒後暴露會造成不可逆肺傷。", means: "結構能撐完救援，但留守者不能無傷撐完。", unknown: "林芮能否在無傷窗口內撤離。" }
      },
      consequences: {
        close: { decision: "立即封閉", next: "t=20 秒，推車控制鏈被切斷；高承撤出，替代小組改走外側進入。", later: "林芮在 4 分鐘後被救出並存活，但留下永久缺氧傷害；高承安全撤出。" },
        hold: { decision: "維持 95 秒救援窗口", next: "t=92 秒，推車把林芮帶出；高承留守到控制廊完成隔離。", later: "林芮在永久傷害前獲救；高承存活，但污染暴露造成永久呼吸傷害。" }
      }
    }
  };

  function dialogue(id, stage, audience, profile, trigger, captionText, spokenText, audioFile, sfx, source, followup) {
    return {
      DIALOGUE_ID: id,
      STAGE: stage,
      AUDIENCE: audience,
      PROFILE: profile,
      TRIGGER: trigger,
      TEXT: captionText,
      VOICE: true,
      SFX: sfx,
      KNOWLEDGE_SOURCE: source,
      FOLLOWUP: followup,
      captionText: captionText,
      spokenText: spokenText,
      audioFile: audioFile,
      assetStatus: "READY"
    };
  }

  var DIALOGUE = [
    dialogue("OP_INDEX", "ENTRY", "ALL", "ALL", "session-created", "三條角色連結已準備好。請各自接手一個角色，查到什麼就交換什麼。", "三條角色連結已準備好，請各自接手一個角色。", "assets/audio/kokoro-zm-010/op_index.mp3", "start", "shared opening", "open one distinct role link per device"),
    dialogue("OP_BOOT", "ROLE", "ALL", "ALL", "role-opened", "岬衛-7 已連線。我會把已接通的資料告訴你；決定由你們做。", "岬衛-7 已連線，資料會一項一項告訴你。", "assets/audio/kokoro-zm-010/op_boot.mp3", "start", "operator opening", "read role responsibility"),
    dialogue("OP_PLAN", "CHOOSE", "ALL", "ALL", "role-started", "六個未知只能查三個。先和隊友說好要補哪一塊，再開始查詢。", "六個未知只能查三個，先和隊友說好要查哪一塊。", "assets/audio/kokoro-zm-010/op_plan.mp3", "signal", "diagnostic resource state", "coordinate the team"),
    dialogue("OP_SHARE", "DISCUSS", "ALL", "ALL", "result-shared", "把查到的和仍不知道的都說出來。不要只報結論。", "把查到的和仍不知道的都說出來。", "assets/audio/kokoro-zm-010/op_share.mp3", "signal", "completed diagnostic result", "share all relevant facts"),
    dialogue("OP_ESCALATE", "DECIDE", "ALL", "ALL", "discussion-complete", "事件窗口正在收束。請用仍然不完整的資料，形成共同決定。", "窗口正在收束，請用手上的資料共同決定。", "assets/audio/kokoro-zm-010/op_escalate.mp3", "escalation", "incident clock", "draft and say one shared action"),
    dialogue("OP_AGREED", "DECIDE", "ALL", "ALL", "agreement-spoken", "共同選項已覆述。確認前仍可改；確認後立即執行。", "共同選項已說清楚，確認前仍可改。", "assets/audio/kokoro-zm-010/op_agreed.mp3", "decision", "local confirmation state", "confirm or revise"),
    dialogue("BL_O1", "OPERATE", "ROLE_1", "breakline", "O1-confirmed", "時序鏈回報：封閉二十秒，撤離九十五秒；兩者互斥。", "封閉二十秒，撤離九十五秒，兩者互斥。", "assets/audio/kokoro-zm-010/bl_o1.mp3", "diagnostic", "backup procedure clock", "share result and boundary"),
    dialogue("BL_O2", "OPERATE", "ROLE_1", "breakline", "O2-confirmed", "備援程序回報：替代進入十一分鐘，晚於西側窗口。", "替代進入要十一分鐘，晚於西側窗口。", "assets/audio/kokoro-zm-010/bl_o2.mp3", "diagnostic", "backup access log", "share result and boundary"),
    dialogue("BL_R1", "OPERATE", "ROLE_2", "breakline", "R1-confirmed", "訊號回報：四秒前直接寫入，有人主動操作。", "四秒前直接寫入，有人仍在操作。", "assets/audio/kokoro-zm-010/bl_r1.mp3", "signal", "wearable packet clock", "share result and boundary"),
    dialogue("BL_R2", "OPERATE", "ROLE_2", "breakline", "R2-confirmed", "西側回波：高位避難龕有定位；推車軌可通。", "高位避難龕有定位，推車軌可通。", "assets/audio/kokoro-zm-010/bl_r2.mp3", "diagnostic", "west echo scanner", "share result and boundary"),
    dialogue("BL_S1", "OPERATE", "ROLE_3", "breakline", "S1-confirmed", "東閘投影：前緣七十二秒抵達，八十三秒通過峰值。", "前緣七十二秒抵達，八十三秒通過峰值。", "assets/audio/kokoro-zm-010/bl_s1.mp3", "escalation", "east pressure line", "share result and boundary"),
    dialogue("BL_S2", "OPERATE", "ROLE_3", "breakline", "S2-confirmed", "撐架回報：裂損模型無法承受完整救援窗口。", "裂損模型撐不過完整救援窗口。", "assets/audio/kokoro-zm-010/bl_s2.mp3", "diagnostic", "brace load model", "share result and boundary"),
    dialogue("BW_O1", "OPERATE", "ROLE_1", "backwash", "O1-confirmed", "時序鏈回報：封閉二十秒，低速撤離九十二秒；兩者互斥。", "封閉二十秒，低速撤離九十二秒，兩者互斥。", "assets/audio/kokoro-zm-010/bw_o1.mp3", "diagnostic", "backup procedure clock", "share result and boundary"),
    dialogue("BW_O2", "OPERATE", "ROLE_1", "backwash", "O2-confirmed", "備援程序回報：替代進入四分鐘；安全空氣約三分鐘。", "替代進入四分鐘，安全空氣約三分鐘。", "assets/audio/kokoro-zm-010/bw_o2.mp3", "diagnostic", "backup access and shelter sensor", "share result and boundary"),
    dialogue("BW_R1", "OPERATE", "ROLE_2", "backwash", "R1-confirmed", "訊號回報：封包延遲四十一秒，無法證明當下位置。", "封包延遲四十一秒，不能證明當下位置。", "assets/audio/kokoro-zm-010/bw_r1.mp3", "signal", "wearable buffer metadata", "share result and boundary"),
    dialogue("BW_R2", "OPERATE", "ROLE_2", "backwash", "R2-confirmed", "西側回波：低速路徑可通，九十二秒完成撤離。", "低速路徑可通，九十二秒完成撤離。", "assets/audio/kokoro-zm-010/bw_r2.mp3", "diagnostic", "west route scanner", "share result and boundary"),
    dialogue("BW_S1", "OPERATE", "ROLE_3", "backwash", "S1-confirmed", "東閘投影：污染八十四秒抵達；結構峰值在九十八秒後。", "污染八十四秒抵達，結構峰值在九十八秒後。", "assets/audio/kokoro-zm-010/bw_s1.mp3", "escalation", "east pressure and aerosol line", "share result and boundary"),
    dialogue("BW_S2", "OPERATE", "ROLE_3", "backwash", "S2-confirmed", "工作站回報：撐架可維持；呼吸防護密封受損。", "撐架可維持，但呼吸防護密封受損。", "assets/audio/kokoro-zm-010/bw_s2.mp3", "diagnostic", "brace model and station seal sensor", "share result and boundary"),
    dialogue("BL_CLOSE", "ENDING", "ALL", "breakline", "close-confirmed", "封閉完成。高承已撤出；西側替代進入未趕上林芮的窗口。", "封閉完成，高承已撤出；替代進入錯過窗口。", "assets/audio/kokoro-zm-010/bl_close.mp3", "consequence", "fixed breakline timeline", "show structured outcome"),
    dialogue("BL_HOLD", "ENDING", "ALL", "breakline", "hold-confirmed", "救援完成。林芮已撤出；東閘撐架在隔離完成後失效。", "救援完成，林芮已撤出；撐架之後失效。", "assets/audio/kokoro-zm-010/bl_hold.mp3", "consequence", "fixed breakline timeline", "show structured outcome"),
    dialogue("BW_CLOSE", "ENDING", "ALL", "backwash", "close-confirmed", "封閉完成。高承已撤出；林芮由替代小組救出。", "封閉完成，替代小組救出林芮。", "assets/audio/kokoro-zm-010/bw_close.mp3", "consequence", "fixed backwash timeline", "show structured outcome"),
    dialogue("BW_HOLD", "ENDING", "ALL", "backwash", "hold-confirmed", "救援完成。兩人存活；高承的暴露造成永久傷害。", "救援完成，兩人存活；高承受到暴露傷害。", "assets/audio/kokoro-zm-010/bw_hold.mp3", "consequence", "fixed backwash timeline", "show structured outcome")
  ];

  var DIALOGUE_BY_ID = {};
  DIALOGUE.forEach(function (row) { DIALOGUE_BY_ID[row.DIALOGUE_ID] = row; });
  var VOICE_MANIFEST = DIALOGUE.map(function (row) {
    return {
      id: row.DIALOGUE_ID,
      stage: row.STAGE,
      audience: row.AUDIENCE,
      profile: row.PROFILE,
      trigger: row.TRIGGER,
      captionText: row.captionText,
      spokenText: row.spokenText,
      audioFile: row.audioFile,
      sfx: row.SFX,
      assetStatus: row.assetStatus,
      engine: "Kokoro-82M-v1.1-zh",
      voice: "zm_010"
    };
  });

  var STAGES = {
    role: { purpose: "ROLE", step: 1, label: "接手角色" },
    choose: { purpose: "CHOOSE", step: 2, label: "協調要查什麼" },
    operate: { purpose: "OPERATE", step: 3, label: "選擇診斷" },
    result: { purpose: "RESULT", step: 4, label: "查看結果" },
    discuss: { purpose: "DISCUSS", step: 5, label: "交換發現" },
    decide: { purpose: "DECIDE", step: 6, label: "共同決定" },
    ending: { purpose: "ENDING", step: 7, label: "事件結束" }
  };

  function normalizeSeed(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }

  function generateSeed() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    var result = "";
    for (var j = 0; j < bytes.length; j += 1) result += alphabet[bytes[j] % alphabet.length];
    return result;
  }

  function deriveProfile(value) {
    var normalized = normalizeSeed(value);
    var hash = 2166136261;
    for (var i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
  }

  function safeStorage() {
    try { return window.localStorage; } catch (_error) { return null; }
  }
  function safeStorageGet(key) {
    var target = safeStorage();
    if (!target) return null;
    try { return target.getItem(key); } catch (_error) { return null; }
  }
  function safeStorageSet(key, value) {
    var target = safeStorage();
    if (!target) return;
    try { target.setItem(key, String(value)); } catch (_error) { /* storage is optional */ }
  }
  function safeStorageRemovePrefix(prefix) {
    var target = safeStorage();
    if (!target) return;
    try {
      var keys = [];
      for (var i = 0; i < target.length; i += 1) {
        var key = target.key(i);
        if (key && key.indexOf(prefix) === 0) keys.push(key);
      }
      keys.forEach(function (key) { target.removeItem(key); });
    } catch (_error) { /* reset remains non-blocking */ }
  }

  function getSeed() {
    var params = new URLSearchParams(window.location.search);
    var requested = normalizeSeed(params.get("seed"));
    var saved = normalizeSeed(safeStorageGet(VERSION + "last-seed"));
    var value = requested.length >= 4 ? requested : (page === "index" && saved.length >= 4 ? saved : generateSeed());
    safeStorageSet(VERSION + "last-seed", value);
    if (!requested && page === "role" && window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState({}, "", "role-" + roleId + ".html?seed=" + encodeURIComponent(value));
    }
    return value;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
  }
  function stateKey(value, role) { return VERSION + value + ":role:" + role; }
  function defaultState() {
    return {
      roleStarted: false,
      coordinationConfirmed: false,
      diagnosticDraft: null,
      diagnosticConfirmed: null,
      resultAcknowledged: false,
      discussionConfirmed: false,
      finalDraft: null,
      agreementSpoken: false,
      finalConfirmed: null,
      currentDialogue: "OP_BOOT",
      dialogueHistory: ["OP_BOOT"]
    };
  }
  function readState(value, role) {
    var base = defaultState();
    try {
      var parsed = JSON.parse(safeStorageGet(stateKey(value, role)));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.assign(base, parsed) : base;
    } catch (_error) { return base; }
  }
  function writeState(value, role, state) { safeStorageSet(stateKey(value, role), JSON.stringify(state)); }
  function audioSettings() {
    var fallback = { enabled: false };
    try {
      var parsed = JSON.parse(safeStorageGet(VERSION + "audio-settings"));
      return parsed && typeof parsed === "object" ? Object.assign(fallback, parsed) : fallback;
    } catch (_error) { return fallback; }
  }
  function writeAudio(settings) { safeStorageSet(VERSION + "audio-settings", JSON.stringify(settings)); }

  var seed = getSeed();
  var profileId = deriveProfile(seed);
  var currentState = roleId ? readState(seed, roleId) : null;

  function dialogueIdForDiagnostic(profile, option) { return (profile === "breakline" ? "BL_" : "BW_") + option; }
  function dialogueIdForConsequence(profile, choice) { return (profile === "breakline" ? "BL_" : "BW_") + choice.toUpperCase(); }
  function roleUrl(id) { return new URL("role-" + id + ".html?seed=" + encodeURIComponent(seed), window.location.href).href; }

  function renderIndex() {
    var caption = document.querySelector("[data-index-caption]");
    var entry = DIALOGUE_BY_ID.OP_INDEX;
    if (caption) caption.innerHTML = "<span>岬衛-7｜字幕</span><p>" + escapeHtml(entry.captionText) + "</p>";
    var grid = document.querySelector("[data-role-links]");
    if (!grid) return;
    grid.innerHTML = Object.keys(ROLES).map(function (id) {
      var role = ROLES[id];
      return "<article class=\"role-link-card\"><div class=\"role-index\">" + role.number + "</div><p class=\"eyebrow\">" + escapeHtml(role.english) + "</p><h3>" + escapeHtml(role.name) + "</h3><p>" + escapeHtml(role.duty) + "</p><div class=\"role-link-actions\"><a class=\"primary-link\" href=\"" + escapeHtml(roleUrl(id)) + "\">在這支手機開啟</a><button class=\"secondary-button\" type=\"button\" data-copy-role=\"" + id + "\">複製角色連結</button></div><small data-copy-status=\"" + id + "\" aria-live=\"polite\"></small></article>";
    }).join("");
  }

  function operatorPanel(state) {
    var row = DIALOGUE_BY_ID[state.currentDialogue] || DIALOGUE_BY_ID.OP_BOOT;
    var settings = audioSettings();
    return "<section class=\"operator-console\" aria-labelledby=\"operator-heading\"><div class=\"operator-head\"><div class=\"operator-avatar\" aria-hidden=\"true\"><span></span><b>7</b></div><div><p class=\"panel-label\">現場播報</p><h2 id=\"operator-heading\">岬衛-7</h2></div><div class=\"operator-state\"><span class=\"status-dot\"></span>已連線</div></div><div class=\"live-caption\" aria-live=\"polite\"><span>字幕</span><p>" + escapeHtml(row.captionText) + "</p></div><div class=\"audio-controls\" aria-label=\"聲音控制\"><button type=\"button\" data-audio-toggle aria-pressed=\"" + settings.enabled + "\">聲音：" + (settings.enabled ? "開" : "關") + "</button><button type=\"button\" data-replay-voice>重播這句</button></div><p class=\"audio-note\">建議只一支手機開聲音；字幕在每支手機都會顯示。</p><p class=\"audio-status\" data-audio-status>" + (settings.enabled ? "聲音已開啟；字幕同步保留。" : "聲音關閉；字幕仍顯示。") + "</p><div class=\"sfx-cue\" data-sfx-cue aria-live=\"polite\">提示音：待命</div><audio data-operator-audio preload=\"none\"></audio></section>";
  }

  function progressBar(stage) {
    return "<div class=\"progress-bar\" aria-label=\"目前進度\"><div><p class=\"eyebrow\">目前進度</p><div class=\"progress-current\"><strong>" + stage.step + " / 7</strong><span>" + stage.label + "</span></div></div><button class=\"reference-button\" type=\"button\" data-reference-open>查看我的資料</button></div>";
  }

  function roleStage(role) {
    var stage = STAGES.role;
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">" + escapeHtml(role.name) + "</h2></div><div class=\"role-brief-line\"><div><h3>【你負責】</h3><p>" + escapeHtml(role.duty) + "</p></div><div><h3>【現在要做】</h3><p>先接手這個角色，再和隊友協調要查哪一塊。</p></div></div><button class=\"primary-button stage-action\" type=\"button\" data-start-role>開始</button></section>";
  }

  function chooseStage() {
    var stage = STAGES.choose;
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">先和隊友說好要補哪一塊</h2></div><p>三個角色各查一件事。現在先確認大家知道要交換查到的事，下一步再選你的查詢方向。</p><ul class=\"coordination-list\"><li><strong>作業時序</strong><span>釐清程序時間與互相切斷的地方。</span></li><li><strong>救援聯絡</strong><span>釐清回應與西側撤離路徑。</span></li><li><strong>結構安全</strong><span>釐清東閘壓力與留守保護。</span></li></ul><button class=\"primary-button stage-action\" type=\"button\" data-coordination-confirm>開始選擇診斷</button></section>";
  }

  function diagnosticStage(role, state) {
    var stage = STAGES.operate;
    var locked = Boolean(state.diagnosticConfirmed);
    var buttons = role.options.map(function (option) {
      return "<button type=\"button\" class=\"diagnostic-option " + (state.diagnosticDraft === option.key ? "is-selected" : "") + "\" data-diagnostic-option=\"" + option.key + "\" aria-pressed=\"" + (state.diagnosticDraft === option.key) + "\" " + (locked ? "disabled" : "") + "><span>" + option.key + "</span><strong>" + escapeHtml(option.title) + "</strong><p>" + escapeHtml(option.question) + "</p><small><b>會帶回</b>" + escapeHtml(option.canKnow) + "</small><small><b>仍留白</b>" + escapeHtml(option.remains) + "</small></button>";
    }).join("");
    var selected = role.options.filter(function (option) { return option.key === state.diagnosticDraft; })[0];
    var draft = selected ? state.diagnosticDraft + "｜" + selected.title : "尚未選擇";
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">選一件你要查的事</h2></div><p>兩個方向只能選一個；先選草稿，確認前可以改。</p><div class=\"diagnostic-grid\">" + buttons + "</div><div class=\"draft-row\"><span>你的選擇</span><strong>" + escapeHtml(draft) + "</strong><small>" + (locked ? "已鎖定" : "確認前可以改選") + "</small></div><button class=\"primary-button stage-action\" type=\"button\" data-diagnostic-confirm " + (!state.diagnosticDraft || locked ? "disabled" : "") + ">" + (locked ? "診斷已鎖定" : "確認這項診斷") + "</button></section>";
  }

  function resultStage(state) {
    var stage = STAGES.result;
    if (!state.diagnosticConfirmed) return "";
    var result = PROFILES[profileId].results[state.diagnosticConfirmed];
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">這次查到的結果</h2></div><div class=\"result-grid\"><div class=\"result-card\"><h3>【查到的】</h3><p>" + escapeHtml(result.found) + "</p></div><div class=\"result-card\"><h3>【這代表】</h3><p>" + escapeHtml(result.means) + "</p></div><div class=\"result-card\"><h3>【仍不知道】</h3><p>" + escapeHtml(result.unknown) + "</p></div></div><button class=\"primary-button stage-action\" type=\"button\" data-result-share>把結果告訴隊友</button></section>";
  }

  function discussStage() {
    var stage = STAGES.discuss;
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">把發現帶回隊伍</h2></div><p>輪流說出你查到的事，也說出哪一塊仍然不知道。隊友可以用「查看我的資料」重新確認自己的證據。</p><p class=\"exchange-prompt\">交換完成前，先不要急著決定下一步。</p><button class=\"primary-button stage-action\" type=\"button\" data-discuss-confirm>交換完成，繼續</button></section>";
  }

  function decisionStage(state) {
    var stage = STAGES.decide;
    var locked = Boolean(state.finalConfirmed);
    var decision = state.finalDraft === "close" ? "立即封閉" : state.finalDraft === "hold" ? "維持 95 秒救援窗口" : "尚未選擇";
    var action = "確認共同決定";
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">現在要一起決定</h2></div><div class=\"decision-summary\"><div><span>【你們已經知道】</span><p>三人各查一件事，也把查到的與仍未知的交換過。</p></div><div><span>【現在要做】</span><p>選一個共同行動；確認前可以改選。</p></div></div><div class=\"decision-grid\"><button type=\"button\" data-final-choice=\"close\" class=\"" + (state.finalDraft === "close" ? "is-selected" : "") + "\" " + (locked ? "disabled" : "") + "><strong>立即封閉</strong><span>在 20 秒內封閉通道，讓高承撤離。</span></button><button type=\"button\" data-final-choice=\"hold\" class=\"" + (state.finalDraft === "hold" ? "is-selected" : "") + "\" " + (locked ? "disabled" : "") + "><strong>維持 95 秒</strong><span>保留 95 秒窗口，讓西側救援繼續。</span></button></div><div class=\"draft-row\"><span>共同選擇草稿</span><strong>" + escapeHtml(decision) + "</strong><small>" + (state.agreementSpoken ? "已覆述；仍可回頭改選" : "選好後一起說出來") + "</small></div><button class=\"secondary-button wide stage-action\" type=\"button\" data-agreement-spoken " + (!state.finalDraft || state.agreementSpoken || locked ? "disabled" : "") + ">" + (state.agreementSpoken ? "已說出共同選擇" : "說出共同選擇") + "</button><button class=\"danger-button wide stage-action\" type=\"button\" data-final-confirm " + (!state.finalDraft || !state.agreementSpoken || locked ? "disabled" : "") + ">" + action + "</button></section>";
  }

  function consequenceStage(state) {
    var stage = STAGES.ending;
    if (!state.finalConfirmed) return "";
    var result = PROFILES[profileId].consequences[state.finalConfirmed];
    return "<section class=\"stage-block\" data-stage-purpose=\"" + stage.purpose + "\" aria-labelledby=\"stage-title\"><div class=\"stage-title\"><span>" + stage.purpose + "｜" + stage.label + "</span><h2 id=\"stage-title\">事件回報</h2></div><div class=\"consequence-grid\"><div class=\"consequence-card\"><h3>【你們的決定】</h3><p>" + escapeHtml(result.decision) + "</p></div><div class=\"consequence-card\"><h3>【接著發生】</h3><p>" + escapeHtml(result.next) + "</p></div><div class=\"consequence-card\"><h3>【後來確認】</h3><p>" + escapeHtml(result.later) + "</p></div></div><p class=\"ending-question\">哪一個未知最影響你們剛才的決定？</p><button class=\"secondary-button wide\" type=\"button\" data-new-session>再玩一場新事件</button></section>";
  }

  function currentStage(state) {
    if (state.finalConfirmed) return STAGES.ending;
    if (state.discussionConfirmed) return STAGES.decide;
    if (state.resultAcknowledged) return STAGES.discuss;
    if (state.diagnosticConfirmed) return STAGES.result;
    if (state.coordinationConfirmed) return STAGES.operate;
    if (state.roleStarted) return STAGES.choose;
    return STAGES.role;
  }

  function currentStageMarkup(role, state) {
    if (state.finalConfirmed) return consequenceStage(state);
    if (state.discussionConfirmed) return decisionStage(state);
    if (state.resultAcknowledged) return discussStage();
    if (state.diagnosticConfirmed) return resultStage(state);
    if (state.coordinationConfirmed) return diagnosticStage(role, state);
    if (state.roleStarted) return chooseStage();
    return roleStage(role);
  }

  function roleTroubleshooting() {
    return "<details class=\"troubleshooting\" data-troubleshooting><summary>遇到問題？查看事件資訊</summary><div class=\"troubleshooting-body\"><p>一般遊玩不需要知道這串識別碼。重新開始只會清除這場 A6R 的進度。</p><code data-seed-code>開啟後顯示</code><button class=\"secondary-button\" type=\"button\" data-reset>重新開始這場事件</button></div></details>";
  }

  function renderRole() {
    var root = document.querySelector("[data-role-root]");
    if (!root || !ROLES[roleId]) return;
    var role = ROLES[roleId];
    if (!currentState.roleStarted) {
      root.innerHTML = roleStage(role);
      return;
    }
    var stage = currentStage(currentState);
    root.innerHTML = operatorPanel(currentState) + progressBar(stage) + currentStageMarkup(role, currentState) + roleTroubleshooting();
  }

  function playSfx(kind) {
    var settings = audioSettings();
    if (!settings.enabled || !kind || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      var Context = window.AudioContext || window.webkitAudioContext;
      var context = new Context();
      var oscillator = context.createOscillator();
      var gain = context.createGain();
      var tones = { start: 520, signal: 680, diagnostic: 760, escalation: 180, decision: 440, consequence: 300 };
      oscillator.frequency.value = tones[kind] || 440;
      oscillator.type = kind === "escalation" ? "sawtooth" : "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.24);
      oscillator.onended = function () { context.close().catch(function () {}); };
    } catch (_error) { /* sound effects never block progression */ }
  }

  function audioFallback(status) {
    if (!status) return;
    status.textContent = "音訊暫時無法播放，請看字幕";
    status.dataset.state = "fallback";
  }

  function playCurrentVoice(replay) {
    if (!currentState) return;
    var row = DIALOGUE_BY_ID[currentState.currentDialogue];
    var settings = audioSettings();
    var status = document.querySelector("[data-audio-status]");
    var cue = document.querySelector("[data-sfx-cue]");
    if (!row) return;
    if (cue) { cue.textContent = "提示音：" + (row.SFX || "無") + (replay ? "（重播）" : ""); cue.classList.add("is-active"); window.setTimeout(function () { cue.classList.remove("is-active"); }, 500); }
    if (!settings.enabled) {
      if (status) { status.textContent = "聲音關閉；字幕仍顯示。"; status.dataset.state = "ready"; }
      return;
    }
    playSfx(row.SFX);
    if (!row.audioFile) {
      audioFallback(status);
      return;
    }
    var audio = document.querySelector("[data-operator-audio]");
    if (!audio) { audioFallback(status); return; }
    audio.onerror = function () { audioFallback(status); };
    audio.onended = function () { if (status) { status.textContent = "播放完成；字幕仍保留。"; status.dataset.state = "ready"; } };
    audio.src = row.audioFile;
    audio.currentTime = 0;
    var promise = audio.play();
    if (promise && typeof promise.catch === "function") promise.catch(function () { audioFallback(status); });
    if (status) { status.textContent = "正在播放；字幕同步保留。"; status.dataset.state = "ready"; }
  }

  function announce(id, shouldPlay) {
    if (!currentState || !DIALOGUE_BY_ID[id]) return;
    currentState.currentDialogue = id;
    currentState.dialogueHistory = currentState.dialogueHistory.filter(function (x) { return x !== id; }).concat(id).slice(-8);
    writeState(seed, roleId, currentState);
    renderRole();
    if (shouldPlay) playCurrentVoice(false);
  }
  function saveAndRender() { writeState(seed, roleId, currentState); renderRole(); }

  function populateSeed(details) {
    if (!details || !details.open) return;
    var node = details.querySelector("[data-seed-code]");
    if (node) node.textContent = seed;
  }

  function referenceMarkup(role, state) {
    var purpose = currentStage(state).purpose;
    var cards = ["<div class=\"revealed-card\"><h3>我的角色</h3><p>" + escapeHtml(role.name) + "</p><p>" + escapeHtml(role.duty) + "</p></div>"];
    if (purpose === "CHOOSE" || purpose === "OPERATE" || purpose === "RESULT" || purpose === "DISCUSS" || purpose === "DECIDE" || purpose === "ENDING") {
      cards.push("<div class=\"revealed-card\"><h3>目前已知</h3><p>" + role.known.map(escapeHtml).join("<br>") + "</p></div>");
    }
    if (state.diagnosticConfirmed && (purpose === "RESULT" || purpose === "DISCUSS" || purpose === "DECIDE" || purpose === "ENDING")) {
      var option = role.options.filter(function (item) { return item.key === state.diagnosticConfirmed; })[0];
      var result = PROFILES[profileId].results[state.diagnosticConfirmed];
      cards.push("<div class=\"revealed-card\"><h3>我查的方向</h3><p>" + escapeHtml(option.title) + "</p></div>");
      cards.push("<div class=\"revealed-card\"><h3>查到的事</h3><p>" + escapeHtml(result.found) + "</p><p>" + escapeHtml(result.means) + "</p><p>仍不知道：" + escapeHtml(result.unknown) + "</p></div>");
    }
    if (purpose === "DECIDE" && state.discussionConfirmed) {
      cards.push("<div class=\"revealed-card\"><h3>交換狀態</h3><p>已把查到的事與仍不知道的邊界交換給隊伍。</p></div>");
    }
    if (purpose === "ENDING" && state.finalConfirmed) {
      var outcome = PROFILES[profileId].consequences[state.finalConfirmed];
      cards.push("<div class=\"revealed-card\"><h3>事件回報</h3><p>" + escapeHtml(outcome.decision) + "</p><p>" + escapeHtml(outcome.next) + "</p><p>" + escapeHtml(outcome.later) + "</p></div>");
    }
    return cards.join("");
  }

  function openReference() {
    if (!currentState || !roleId) return;
    var dialog = document.querySelector("[data-reference-dialog]");
    var content = dialog && dialog.querySelector("[data-reference-content]");
    if (!dialog || !content) return;
    content.innerHTML = referenceMarkup(ROLES[roleId], currentState);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeReference() {
    var dialog = document.querySelector("[data-reference-dialog]");
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function startNewEvent() {
    safeStorageRemovePrefix(VERSION + seed + ":");
    var fresh = generateSeed();
    while (fresh === seed) fresh = generateSeed();
    safeStorageSet(VERSION + "last-seed", fresh);
    window.location.href = "index.html?seed=" + encodeURIComponent(fresh) + "#session";
  }

  document.addEventListener("toggle", function (event) {
    if (event.target && event.target.matches("[data-troubleshooting]")) populateSeed(event.target);
  }, true);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeReference();
  });

  document.addEventListener("click", function (event) {
    var target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-new-session], [data-reset]")) { startNewEvent(); return; }
    if (target.matches("[data-copy-role]")) {
      var id = target.dataset.copyRole;
      var status = document.querySelector("[data-copy-status=\"" + id + "\"]");
      var url = roleUrl(id);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { if (status) status.textContent = "已複製角色連結。"; }).catch(function () { if (status) status.textContent = "請長按上方連結複製。"; });
      else if (status) status.textContent = "請長按上方連結複製。";
      return;
    }
    if (target.matches("[data-reference-open]")) { openReference(); return; }
    if (target.matches("[data-reference-close]")) {
      closeReference();
      return;
    }
    if (!currentState) return;
    if (target.matches("[data-audio-toggle]")) {
      var settings = audioSettings();
      settings.enabled = !settings.enabled;
      writeAudio(settings);
      renderRole();
      playCurrentVoice(false);
      return;
    }
    if (target.matches("[data-replay-voice]")) { playCurrentVoice(true); return; }
    if (target.matches("[data-start-role]") && !currentState.roleStarted) {
      currentState.roleStarted = true;
      announce("OP_PLAN", true);
      return;
    }
    if (target.matches("[data-coordination-confirm]") && currentState.roleStarted && !currentState.coordinationConfirmed) {
      currentState.coordinationConfirmed = true;
      saveAndRender();
      return;
    }
    if (target.matches("[data-diagnostic-option]") && !currentState.diagnosticConfirmed) {
      currentState.diagnosticDraft = target.dataset.diagnosticOption;
      saveAndRender();
      return;
    }
    if (target.matches("[data-diagnostic-confirm]") && currentState.diagnosticDraft && !currentState.diagnosticConfirmed) {
      currentState.diagnosticConfirmed = currentState.diagnosticDraft;
      announce(dialogueIdForDiagnostic(profileId, currentState.diagnosticConfirmed), true);
      return;
    }
    if (target.matches("[data-result-share]") && currentState.diagnosticConfirmed && !currentState.resultAcknowledged) {
      currentState.resultAcknowledged = true;
      announce("OP_SHARE", true);
      return;
    }
    if (target.matches("[data-discuss-confirm]") && currentState.resultAcknowledged && !currentState.discussionConfirmed) {
      currentState.discussionConfirmed = true;
      announce("OP_ESCALATE", true);
      return;
    }
    if (target.matches("[data-final-choice]") && !currentState.finalConfirmed) {
      currentState.finalDraft = target.dataset.finalChoice;
      currentState.agreementSpoken = false;
      saveAndRender();
      return;
    }
    if (target.matches("[data-agreement-spoken]") && currentState.finalDraft && !currentState.finalConfirmed) {
      currentState.agreementSpoken = true;
      announce("OP_AGREED", true);
      return;
    }
    if (target.matches("[data-final-confirm]") && currentState.finalDraft && currentState.agreementSpoken && !currentState.finalConfirmed) {
      currentState.finalConfirmed = currentState.finalDraft;
      announce(dialogueIdForConsequence(profileId, currentState.finalConfirmed), true);
    }
  });

  if (page === "index") renderIndex();
  if (page === "role" && ROLES[roleId]) renderRole();

  window.MomeyA6R = Object.freeze({
    VERSION: VERSION,
    roles: ROLES,
    profiles: PROFILES,
    dialogue: DIALOGUE,
    voiceManifest: VOICE_MANIFEST,
    stages: STAGES,
    defaultState: defaultState,
    currentStage: currentStage,
    renderCurrentStage: currentStageMarkup,
    renderReference: referenceMarkup,
    normalizeSeed: normalizeSeed,
    deriveProfile: deriveProfile,
    stateKey: stateKey
  });
}());


