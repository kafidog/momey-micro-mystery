(function () {
  "use strict";

  var VERSION = "momey-a6:";
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
      unknown: ["前緣何時抵達。", "撐架與呼吸防護能否撐過救援窗口。"],
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

  function dialogue(id, stage, audience, profile, trigger, text, voice, sfx, source, followup) {
    return { DIALOGUE_ID: id, STAGE: stage, AUDIENCE: audience, PROFILE: profile, TRIGGER: trigger, TEXT: text, VOICE: voice, SFX: sfx, KNOWLEDGE_SOURCE: source, FOLLOWUP: followup };
  }

  var DIALOGUE = [
    dialogue("OP_INDEX", "ENTRY", "ALL", "ALL", "session-created", "事件鏈路已建立。三位人類應變員，請各自接手一項角色。", true, "start", "session seed and role links", "open one distinct role link per device"),
    dialogue("OP_BOOT", "ROLE", "ALL", "ALL", "role-opened", "岬衛-7 上線。我只回報已接通的資料；決定由你們做。", true, "start", "operator protocol", "read role responsibility"),
    dialogue("OP_PLAN", "PLAN", "ALL", "ALL", "planning-confirmed", "六個未知只能查三個。先說好每個人要留下哪一個空白。", true, "signal", "diagnostic resource state", "each role drafts one diagnostic"),
    dialogue("OP_SHARE", "SHARE", "ALL", "ALL", "diagnostic-complete", "把查到的和仍不知道的都說出來。不要只報結論。", true, "signal", "completed diagnostic result", "share all relevant facts"),
    dialogue("OP_ESCALATE", "DECISION", "ALL", "ALL", "sharing-complete", "事件窗口正在收束。請用仍然不完整的資料，形成共同決定。", true, "escalation", "incident clock", "draft and say one shared action"),
    dialogue("OP_AGREED", "DECISION", "ALL", "ALL", "agreement-spoken", "共同選項已覆述。確認前仍可改；確認後立即執行。", true, "decision", "local confirmation state", "confirm or revise"),
    dialogue("BL_O1", "DIAGNOSTIC", "ROLE_1", "breakline", "O1-confirmed", "時序鏈回報：封閉二十秒，撤離九十五秒；兩者互斥。", true, "diagnostic", "backup procedure clock", "share result and boundary"),
    dialogue("BL_O2", "DIAGNOSTIC", "ROLE_1", "breakline", "O2-confirmed", "備援程序回報：替代進入十一分鐘，晚於西側窗口。", true, "diagnostic", "backup access log", "share result and boundary"),
    dialogue("BL_R1", "DIAGNOSTIC", "ROLE_2", "breakline", "R1-confirmed", "訊號回報：四秒前直接寫入，有人主動操作。", true, "signal", "wearable packet clock", "share result and boundary"),
    dialogue("BL_R2", "DIAGNOSTIC", "ROLE_2", "breakline", "R2-confirmed", "西側回波：高位避難龕有定位；推車軌可通。", true, "diagnostic", "west echo scanner", "share result and boundary"),
    dialogue("BL_S1", "DIAGNOSTIC", "ROLE_3", "breakline", "S1-confirmed", "東閘投影：前緣七十二秒抵達，八十三秒通過峰值。", true, "escalation", "east pressure line", "share result and boundary"),
    dialogue("BL_S2", "DIAGNOSTIC", "ROLE_3", "breakline", "S2-confirmed", "撐架回報：裂損模型無法承受完整救援窗口。", true, "diagnostic", "brace load model", "share result and boundary"),
    dialogue("BW_O1", "DIAGNOSTIC", "ROLE_1", "backwash", "O1-confirmed", "時序鏈回報：封閉二十秒，低速撤離九十二秒；兩者互斥。", true, "diagnostic", "backup procedure clock", "share result and boundary"),
    dialogue("BW_O2", "DIAGNOSTIC", "ROLE_1", "backwash", "O2-confirmed", "備援程序回報：替代進入四分鐘；安全空氣約三分鐘。", true, "diagnostic", "backup access and shelter sensor", "share result and boundary"),
    dialogue("BW_R1", "DIAGNOSTIC", "ROLE_2", "backwash", "R1-confirmed", "訊號回報：封包延遲四十一秒，無法證明當下位置。", true, "signal", "wearable buffer metadata", "share result and boundary"),
    dialogue("BW_R2", "DIAGNOSTIC", "ROLE_2", "backwash", "R2-confirmed", "西側回波：低速路徑可通，九十二秒完成撤離。", true, "diagnostic", "west route scanner", "share result and boundary"),
    dialogue("BW_S1", "DIAGNOSTIC", "ROLE_3", "backwash", "S1-confirmed", "東閘投影：污染八十四秒抵達；結構峰值在九十八秒後。", true, "escalation", "east pressure and aerosol line", "share result and boundary"),
    dialogue("BW_S2", "DIAGNOSTIC", "ROLE_3", "backwash", "S2-confirmed", "工作站回報：撐架可維持；呼吸防護密封受損。", true, "diagnostic", "brace model and station seal sensor", "share result and boundary"),
    dialogue("BL_CLOSE", "CONSEQUENCE", "ALL", "breakline", "close-confirmed", "封閉完成。高承已撤出；西側替代進入未趕上林芮的窗口。", true, "consequence", "fixed breakline timeline", "show structured outcome"),
    dialogue("BL_HOLD", "CONSEQUENCE", "ALL", "breakline", "hold-confirmed", "救援完成。林芮已撤出；東閘撐架在隔離完成後失效。", true, "consequence", "fixed breakline timeline", "show structured outcome"),
    dialogue("BW_CLOSE", "CONSEQUENCE", "ALL", "backwash", "close-confirmed", "封閉完成。高承已撤出；林芮由替代小組救出。", true, "consequence", "fixed backwash timeline", "show structured outcome"),
    dialogue("BW_HOLD", "CONSEQUENCE", "ALL", "backwash", "hold-confirmed", "救援完成。兩人存活；高承的暴露造成永久傷害。", true, "consequence", "fixed backwash timeline", "show structured outcome")
  ];

  var DIALOGUE_BY_ID = {};
  DIALOGUE.forEach(function (row) { DIALOGUE_BY_ID[row.DIALOGUE_ID] = row; });

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

  function deriveProfile(seed) {
    var normalized = normalizeSeed(seed);
    var hash = 2166136261;
    for (var i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
  }

  function getSeed() {
    var params = new URLSearchParams(window.location.search);
    var requested = normalizeSeed(params.get("seed"));
    var saved = normalizeSeed(safeStorageGet(VERSION + "last-seed"));
    var seed = requested.length >= 4 ? requested : (page === "index" && saved.length >= 4 ? saved : generateSeed());
    safeStorageSet(VERSION + "last-seed", seed);
    if (requested !== seed) {
      params.set("seed", seed);
      window.history.replaceState(null, "", window.location.pathname + "?" + params.toString() + window.location.hash);
    }
    return seed;
  }

  function safeStorage() {
    try { return window.localStorage; } catch (_error) { return null; }
  }
  function safeStorageGet(key) {
    var target = safeStorage();
    try { return target ? target.getItem(key) : null; } catch (_error) { return null; }
  }
  function safeStorageSet(key, value) {
    var target = safeStorage();
    try { if (target) target.setItem(key, value); } catch (_error) { /* gameplay remains available */ }
  }
  function safeStorageRemovePrefix(prefix) {
    var target = safeStorage();
    if (!target) return;
    try {
      Object.keys(target).filter(function (key) { return key.indexOf(prefix) === 0; }).forEach(function (key) { target.removeItem(key); });
    } catch (_error) { /* reset remains best-effort */ }
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]; });
  }
  function stateKey(seed, role) { return VERSION + seed + ":role:" + role; }
  function defaultState() {
    return { planningConfirmed: false, diagnosticDraft: null, diagnosticConfirmed: null, sharingConfirmed: false, finalDraft: null, agreementSpoken: false, finalConfirmed: null, currentDialogue: "OP_BOOT", dialogueHistory: ["OP_BOOT"] };
  }
  function readState(seed, role) {
    var base = defaultState();
    try {
      var parsed = JSON.parse(safeStorageGet(stateKey(seed, role)));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.assign(base, parsed) : base;
    } catch (_error) { return base; }
  }
  function writeState(seed, role, state) { safeStorageSet(stateKey(seed, role), JSON.stringify(state)); }
  function audioSettings() {
    var fallback = { master: false, muted: false };
    try {
      var parsed = JSON.parse(safeStorageGet(VERSION + "audio-settings"));
      return parsed && typeof parsed === "object" ? Object.assign(fallback, parsed) : fallback;
    } catch (_error) { return fallback; }
  }
  function writeAudio(settings) { safeStorageSet(VERSION + "audio-settings", JSON.stringify(settings)); }

  var seed = getSeed();
  var profileId = deriveProfile(seed);
  var currentState = roleId ? readState(seed, roleId) : null;

  function dialogueIdForDiagnostic(profile, option) {
    return (profile === "breakline" ? "BL_" : "BW_") + option;
  }
  function dialogueIdForConsequence(profile, choice) {
    return (profile === "breakline" ? "BL_" : "BW_") + choice.toUpperCase();
  }

  function roleUrl(id) {
    return new URL("role-" + id + ".html?seed=" + encodeURIComponent(seed), window.location.href).href;
  }

  function renderIndex() {
    var code = document.querySelector("[data-seed-code]");
    if (code) code.textContent = seed;
    var caption = document.querySelector("[data-index-caption]");
    if (caption) caption.innerHTML = "<span>岬衛-7</span><p>" + escapeHtml(DIALOGUE_BY_ID.OP_INDEX.TEXT) + "</p>";
    var grid = document.querySelector("[data-role-links]");
    if (!grid) return;
    grid.innerHTML = Object.keys(ROLES).map(function (id) {
      var role = ROLES[id];
      return "<article class=\"role-link-card\"><div class=\"role-index\">" + role.number + "</div><p class=\"eyebrow\">" + escapeHtml(role.english) + "</p><h3>" + escapeHtml(role.name) + "</h3><p>" + escapeHtml(role.tagline) + "</p><div class=\"role-link-actions\"><a class=\"primary-link\" href=\"" + escapeHtml(roleUrl(id)) + "\">在這支手機開啟</a><button class=\"secondary-button\" type=\"button\" data-copy-role=\"" + id + "\">複製角色連結</button></div><small data-copy-status=\"" + id + "\"></small></article>";
    }).join("");
  }

  function operatorPanel(state) {
    var row = DIALOGUE_BY_ID[state.currentDialogue] || DIALOGUE_BY_ID.OP_BOOT;
    var settings = audioSettings();
    var history = state.dialogueHistory.slice(-4).map(function (id) {
      var item = DIALOGUE_BY_ID[id];
      return item ? "<li><span>" + escapeHtml(item.STAGE) + "</span><p>" + escapeHtml(item.TEXT) + "</p></li>" : "";
    }).join("");
    return "<section class=\"operator-console\" aria-labelledby=\"operator-heading\"><div class=\"operator-head\"><div class=\"operator-avatar\" aria-hidden=\"true\"><span></span><b>7</b></div><div><p class=\"panel-label\">純腳本數位事件操作員</p><h2 id=\"operator-heading\">岬衛-7</h2></div><div class=\"operator-state\"><span class=\"status-dot\"></span>已接通</div></div><div class=\"live-caption\" aria-live=\"polite\"><span>字幕｜" + escapeHtml(row.DIALOGUE_ID) + "</span><p>" + escapeHtml(row.TEXT) + "</p></div><div class=\"audio-controls\" aria-label=\"語音控制\"><button type=\"button\" data-audio-toggle aria-pressed=\"" + settings.master + "\">共享語音：" + (settings.master ? "開" : "關") + "</button><button type=\"button\" data-mute aria-pressed=\"" + settings.muted + "\">" + (settings.muted ? "取消靜音" : "靜音") + "</button><button type=\"button\" data-replay-voice>重播語音</button></div><p class=\"audio-note\" data-audio-status>只在一支手機開啟共享語音；這不會取得任何決策權。</p><div class=\"sfx-cue\" data-sfx-cue aria-live=\"polite\">聲音提示：待命</div><details class=\"caption-history\"><summary>最近字幕</summary><ol>" + history + "</ol></details></section>";
  }

  function roleBrief(role) {
    return "<section class=\"role-hero\"><div><p class=\"eyebrow\">" + escapeHtml(role.english) + "｜平等角色</p><h1>" + escapeHtml(role.name) + "</h1><p>" + escapeHtml(role.tagline) + "</p></div><div class=\"role-stamp\"><span>ROLE</span><strong>" + role.number + "</strong></div></section><section class=\"panel role-brief\"><div class=\"panel-label\">你的角色</div><h2>接起自己的責任</h2><div class=\"brief-grid\"><div><h3>【你的職責】</h3><p>" + escapeHtml(role.duty) + "</p></div><div><h3>【現在已知】</h3><ul>" + role.known.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul></div><div><h3>【還不知道】</h3><ul>" + role.unknown.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul></div><div><h3>【你可以做】</h3><p>在兩項角色診斷中選一項；確認後，本次事件不再開放另一項。</p></div></div></section>";
  }

  function planningStage(state) {
    return "<section class=\"stage-block planning-stage\"><div class=\"stage-title\"><span>STAGE 01</span><h2>先規劃三個診斷槽</h2></div><p>六個未知只能查三個。先看自己的兩個選項，和隊友說好要覆蓋哪些風險。</p><div class=\"planning-map\"><span>作業時序 1 格</span><span>救援聯絡 1 格</span><span>結構安全 1 格</span></div><button class=\"primary-button\" type=\"button\" data-planning-confirm " + (state.planningConfirmed ? "disabled" : "") + ">" + (state.planningConfirmed ? "全隊已完成診斷規劃" : "全隊已完成診斷規劃") + "</button></section>";
  }

  function diagnosticStage(role, state) {
    if (!state.planningConfirmed) return "";
    var locked = Boolean(state.diagnosticConfirmed);
    var buttons = role.options.map(function (option) {
      return "<button type=\"button\" class=\"diagnostic-option " + (state.diagnosticDraft === option.key ? "is-selected" : "") + "\" data-diagnostic-option=\"" + option.key + "\" aria-pressed=\"" + (state.diagnosticDraft === option.key) + "\" " + (locked ? "disabled" : "") + "><span>" + option.key + "</span><strong>" + escapeHtml(option.title) + "</strong><p>" + escapeHtml(option.question) + "</p><small><b>可查到</b>" + escapeHtml(option.canKnow) + "</small><small><b>仍留下</b>" + escapeHtml(option.remains) + "</small></button>";
    }).join("");
    var draft = state.diagnosticDraft ? state.diagnosticDraft + "｜" + role.options.filter(function (x) { return x.key === state.diagnosticDraft; })[0].title : "尚未選擇";
    return "<section class=\"stage-block diagnostic-stage\"><div class=\"stage-title\"><span>STAGE 02</span><h2>【本輪只能查一項】</h2></div><div class=\"diagnostic-grid\">" + buttons + "</div><div class=\"draft-row\"><span>你的診斷草稿</span><strong>" + escapeHtml(draft) + "</strong><small>" + (locked ? "診斷槽已使用" : "確認前可以改選") + "</small></div><button class=\"primary-button\" type=\"button\" data-diagnostic-confirm " + (!state.diagnosticDraft || locked ? "disabled" : "") + ">" + (locked ? "診斷已鎖定" : "使用這一格診斷") + "</button></section>";
  }

  function resultStage(state) {
    if (!state.diagnosticConfirmed) return "";
    var result = PROFILES[profileId].results[state.diagnosticConfirmed];
    return "<section class=\"stage-block result-stage\"><div class=\"stage-title\"><span>STAGE 03｜岬衛-7 固定回覆</span><h2>診斷結果</h2></div><div class=\"result-grid\"><div><h3>【查到的】</h3><p>" + escapeHtml(result.found) + "</p></div><div><h3>【這代表】</h3><p>" + escapeHtml(result.means) + "</p></div><div><h3>【仍不知道】</h3><p>" + escapeHtml(result.unknown) + "</p></div></div><p class=\"slot-closed\">另一項角色診斷本次不再開放。</p><button class=\"primary-button\" type=\"button\" data-sharing-confirm " + (state.sharingConfirmed ? "disabled" : "") + ">" + (state.sharingConfirmed ? "已把結果與邊界說給隊友" : "已把結果與邊界說給隊友") + "</button></section>";
  }

  function decisionStage(state) {
    if (!state.sharingConfirmed) return "";
    var locked = Boolean(state.finalConfirmed);
    var decision = state.finalDraft === "close" ? "立即封閉" : state.finalDraft === "hold" ? "維持 95 秒救援窗口" : "尚未選擇";
    return "<section class=\"stage-block decision-stage\"><div class=\"stage-title\"><span>STAGE 04｜三人共同決定</span><h2>事件窗口正在收束</h2></div><div class=\"final-summary\"><div><span>【已確認】</span><p>三人各完成一項診斷，並公開結果與證據邊界。</p></div><div><span>【仍未知】</span><p>三個未選診斷維持未知；岬衛-7 不會補上答案。</p></div><div><span>【現在必須決定】</span><p>立即封閉，或維持 95 秒救援窗口。</p></div></div><div class=\"decision-grid\"><button type=\"button\" data-final-choice=\"close\" class=\"" + (state.finalDraft === "close" ? "is-selected" : "") + "\" " + (locked ? "disabled" : "") + "><strong>立即封閉</strong><span>t=20 秒切斷西側推車控制鏈；高承撤離東閘。</span></button><button type=\"button\" data-final-choice=\"hold\" class=\"" + (state.finalDraft === "hold" ? "is-selected" : "") + "\" " + (locked ? "disabled" : "") + "><strong>維持 95 秒</strong><span>保留西側救援程序；高承留守東閘到隔離完成。</span></button></div><div class=\"draft-row\"><span>共同選項草稿</span><strong>" + escapeHtml(decision) + "</strong><small>" + (locked ? "已執行" : "說出口並確認前可改") + "</small></div><button class=\"secondary-button wide\" type=\"button\" data-agreement-spoken " + (!state.finalDraft || locked ? "disabled" : "") + ">" + (state.agreementSpoken ? "三人已覆述同一選項" : "三人已把同一選項說出口") + "</button><button class=\"danger-button\" type=\"button\" data-final-confirm " + (!state.finalDraft || !state.agreementSpoken || locked ? "disabled" : "") + ">" + (locked ? "共同決定已執行" : "確認並執行共同決定") + "</button></section>";
  }

  function consequenceStage(state) {
    if (!state.finalConfirmed) return "";
    var result = PROFILES[profileId].consequences[state.finalConfirmed];
    return "<section class=\"stage-block consequence-stage\"><div class=\"stage-title\"><span>STAGE 05｜固定後果</span><h2>岬衛-7：事件回報</h2></div><div class=\"consequence-grid\"><div><h3>【你們的決定】</h3><p>" + escapeHtml(result.decision) + "</p></div><div><h3>【接著發生】</h3><p>" + escapeHtml(result.next) + "</p></div><div><h3>【後來確認】</h3><p>" + escapeHtml(result.later) + "</p></div></div><p class=\"human-question\">哪一個未知最影響你們剛才的決定？</p></section>";
  }

  function renderRole() {
    var root = document.querySelector("[data-role-root]");
    if (!root || !ROLES[roleId]) return;
    var topSeed = document.querySelector("[data-top-seed]");
    if (topSeed) topSeed.textContent = "事件 " + seed;
    var role = ROLES[roleId];
    root.innerHTML = operatorPanel(currentState) + roleBrief(role) + planningStage(currentState) + diagnosticStage(role, currentState) + resultStage(currentState) + decisionStage(currentState) + consequenceStage(currentState) + "<div class=\"team-reset\"><button class=\"text-button\" type=\"button\" data-reset>清除這次 A6 進度並建立新事件</button></div>";
  }

  function selectVoice() {
    if (!window.speechSynthesis || typeof window.speechSynthesis.getVoices !== "function") return null;
    var voices = window.speechSynthesis.getVoices();
    return voices.filter(function (v) { return /^zh-TW$/i.test(v.lang); })[0] || voices.filter(function (v) { return /^zh/i.test(v.lang); })[0] || voices[0] || null;
  }

  function playSfx(kind) {
    var settings = audioSettings();
    if (!settings.master || settings.muted || !kind || !window.AudioContext && !window.webkitAudioContext) return;
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
    } catch (_error) { /* SFX never blocks progression */ }
  }

  function speakCurrent(replay) {
    if (!currentState) return;
    var settings = audioSettings();
    var status = document.querySelector("[data-audio-status]");
    var row = DIALOGUE_BY_ID[currentState.currentDialogue];
    if (!row) return;
    var cue = document.querySelector("[data-sfx-cue]");
    if (cue) { cue.textContent = "視覺提示：" + (row.SFX || "無") + (replay ? "（重播）" : ""); cue.classList.add("is-active"); window.setTimeout(function () { cue.classList.remove("is-active"); }, 500); }
    if (!settings.master || settings.muted) {
      if (status) status.textContent = settings.muted ? "目前靜音；字幕保留。" : "共享語音關閉；字幕保留。";
      return;
    }
    playSfx(row.SFX);
    if (!row.VOICE || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      if (status) status.textContent = "此瀏覽器未提供可用語音；字幕與流程不受影響。";
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(row.TEXT);
      var voice = selectVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice ? voice.lang : "zh-TW";
      utterance.rate = 1.02;
      utterance.pitch = 0.86;
      utterance.volume = 0.85;
      utterance.onerror = function () { if (status) status.textContent = "語音播放失敗；字幕與流程不受影響。"; };
      window.speechSynthesis.speak(utterance);
      if (status) status.textContent = voice && /^zh-TW$/i.test(voice.lang) ? "使用 zh-TW 語音；字幕同步保留。" : "使用可用語音；字幕同步保留。";
    } catch (_error) { if (status) status.textContent = "語音播放失敗；字幕與流程不受影響。"; }
  }

  function announce(id, shouldPlay) {
    if (!currentState || !DIALOGUE_BY_ID[id]) return;
    currentState.currentDialogue = id;
    currentState.dialogueHistory = currentState.dialogueHistory.filter(function (x) { return x !== id; }).concat(id).slice(-8);
    writeState(seed, roleId, currentState);
    renderRole();
    if (shouldPlay) speakCurrent(false);
  }

  function saveAndRender() {
    writeState(seed, roleId, currentState);
    renderRole();
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-new-session]")) {
      var fresh = generateSeed();
      while (fresh === seed) fresh = generateSeed();
      safeStorageSet(VERSION + "last-seed", fresh);
      window.location.href = "index.html?seed=" + encodeURIComponent(fresh) + "#session";
      return;
    }
    if (target.matches("[data-copy-role]")) {
      var id = target.dataset.copyRole;
      var status = document.querySelector("[data-copy-status=\"" + id + "\"]");
      var url = roleUrl(id);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { if (status) status.textContent = "已複製。"; }).catch(function () { if (status) status.textContent = url; });
      else if (status) status.textContent = url;
      return;
    }
    if (target.matches("[data-reset]")) {
      safeStorageRemovePrefix(VERSION + seed + ":");
      var freshSeed = generateSeed();
      safeStorageSet(VERSION + "last-seed", freshSeed);
      window.location.href = "index.html?seed=" + encodeURIComponent(freshSeed) + "#session";
      return;
    }
    if (!currentState) return;
    if (target.matches("[data-audio-toggle]")) {
      var settings = audioSettings();
      settings.master = !settings.master;
      writeAudio(settings);
      renderRole();
      if (settings.master && !settings.muted) speakCurrent(false);
      return;
    }
    if (target.matches("[data-mute]")) {
      var muteSettings = audioSettings();
      muteSettings.muted = !muteSettings.muted;
      writeAudio(muteSettings);
      if (window.speechSynthesis && typeof window.speechSynthesis.cancel === "function") window.speechSynthesis.cancel();
      renderRole();
      return;
    }
    if (target.matches("[data-replay-voice]")) { speakCurrent(true); return; }
    if (target.matches("[data-planning-confirm]") && !currentState.planningConfirmed) {
      currentState.planningConfirmed = true;
      announce("OP_PLAN", true);
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
    if (target.matches("[data-sharing-confirm]") && currentState.diagnosticConfirmed && !currentState.sharingConfirmed) {
      currentState.sharingConfirmed = true;
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

  if (window.speechSynthesis && typeof window.speechSynthesis.addEventListener === "function") window.speechSynthesis.addEventListener("voiceschanged", selectVoice);
  if (page === "index") renderIndex();
  if (page === "role" && ROLES[roleId]) renderRole();

  window.MomeyA6 = Object.freeze({
    VERSION: VERSION,
    roles: ROLES,
    profiles: PROFILES,
    dialogue: DIALOGUE,
    normalizeSeed: normalizeSeed,
    deriveProfile: deriveProfile,
    stateKey: stateKey
  });
}());
