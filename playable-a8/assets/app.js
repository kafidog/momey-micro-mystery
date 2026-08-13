(function (global) {
  "use strict";

  var root = document.querySelector("[data-app]");
  var DIALOGUE = global.MOMEY_A8_DIALOGUE || [];
  var DIALOGUE_BY_ID = {};
  var ROLE_IDS = ["operations", "rescue", "safety"];
  var ROLE_LABELS = {
    operations: "現場調度",
    rescue: "救援聯絡",
    safety: "結構安全"
  };
  var ROLE_DUTIES = {
    operations: "負責電力、中央隔離閘和現場順序。",
    rescue: "負責林芮的回應、救援車和可走的路。",
    safety: "負責高承、手動撐桿和中央隔離閘的安全支點。"
  };
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
    LOBBY: "等待三人接手角色",
    ROUND1_ACTION: "第一回合｜看清狀況",
    ROUND1_DISCUSS: "第一回合｜交換發現",
    ROUND2_ACTION: "第二回合｜做出應變",
    ROUND2_DISCUSS: "第二回合｜交換現場結果",
    ROUND3_ACTION: "第三回合｜最後窗口",
    ROUND3_DISCUSS: "第三回合｜交換最後結果",
    FINAL_VOTE: "一起選最後動作",
    ENDING: "事件結果"
  };
  var STORAGE_PREFIX = "momey-a8:";
  var queryAudioFallback = Number(new URLSearchParams(window.location.search).get("audioFallbackMs"));
  var AUDIO_FALLBACK_MS = global.__MOMEY_A8_TEST__ && global.__MOMEY_A8_TEST__.audioFallbackMs || (Number.isFinite(queryAudioFallback) && queryAudioFallback > 0 ? queryAudioFallback : 7000);
  var state = null;
  var roomCode = null;
  var currentRole = null;
  var selectedRole = null;
  var socket = null;
  var reconnectTimer = null;
  var reconnectAttempts = 0;
  var pendingCommand = null;
  var pendingTakeover = false;
  var commandBusy = false;
  var draftAction = null;
  var draftActionPhase = null;
  var statusMessage = "";
  var statusKind = "";
  var audioUnlocked = false;
  var audioEnabled = true;
  var audioAttempted = {};
  var audioTimer = null;
  var audioCompleteSent = {};
  var lastRenderedAudioId = null;
  var audioRoomScope = null;
  var operatorAudio = null;
  var audioEventBinding = null;
  var missingAudio = new URLSearchParams(window.location.search).get("missingAudio") === "1";

  DIALOGUE.forEach(function (row) { DIALOGUE_BY_ID[row.DIALOGUE_ID] = row; });

  function testHook(name) {
    return global.__MOMEY_A8_TEST__ && typeof global.__MOMEY_A8_TEST__[name] === "function" ? global.__MOMEY_A8_TEST__[name] : null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getStore() {
    try { return window.localStorage; } catch (_error) { return null; }
  }

  function storageKey(kind) {
    return STORAGE_PREFIX + String(roomCode || "none") + ":" + kind;
  }

  function getStored(kind) {
    var store = getStore();
    if (!store) return null;
    try { return store.getItem(storageKey(kind)); } catch (_error) { return null; }
  }

  function setStored(kind, value) {
    var store = getStore();
    if (!store) return;
    try { store.setItem(storageKey(kind), String(value)); } catch (_error) { /* local recovery is best effort */ }
  }

  function removeStored(kind) {
    var store = getStore();
    if (!store) return;
    try { store.removeItem(storageKey(kind)); } catch (_error) { /* local recovery is best effort */ }
  }

  function workerBaseUrl() {
    var query = new URLSearchParams(window.location.search).get("worker");
    var configured = global.MOMEY_A8_WORKER_URL || query;
    if (configured) return String(configured).replace(/\/$/, "");
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return "http://127.0.0.1:8787";
    return "https://momey-playable-a8-room.momey-micro-mystery.workers.dev";
  }

  function wsBaseUrl() {
    return workerBaseUrl().replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  }

  function pageBasePath() {
    return window.location.href.split("?")[0].split("#")[0];
  }

  function makeShareUrl(code) {
    var url = new URL(pageBasePath());
    url.searchParams.set("room", code);
    var queryWorker = new URLSearchParams(window.location.search).get("worker");
    if (queryWorker) url.searchParams.set("worker", queryWorker);
    return url.toString();
  }

  function roleToken(roleId) {
    return getStored("token:" + roleId);
  }

  function saveRoleToken(roleId, token) {
    if (token) setStored("token:" + roleId, token);
    setStored("last-role", roleId);
  }

  function updateUrl(code) {
    var url = new URL(window.location.href);
    url.searchParams.set("room", code);
    window.history.replaceState({}, "", url.toString());
  }

  function setStatus(message, kind) {
    statusMessage = message || "";
    statusKind = kind || "";
  }

  function clearAudioTimer() {
    if (audioTimer) window.clearTimeout(audioTimer);
    audioTimer = null;
  }

  function resetAudioRoomScope(nextRoomCode) {
    if (audioRoomScope === nextRoomCode) return;
    clearAudioTimer();
    audioAttempted = {};
    audioCompleteSent = {};
    lastRenderedAudioId = null;
    audioEventBinding = null;
    draftAction = null;
    draftActionPhase = null;
    audioRoomScope = nextRoomCode || null;
    audioUnlocked = false;
  }

  function audioKey(eventId) {
    return String(audioRoomScope || roomCode || "none") + ":" + String(eventId || "none");
  }

  function scrollTop() {
    if (typeof window.scrollTo === "function") window.requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }

  function rowForEvent(eventId) {
    return eventId ? DIALOGUE_BY_ID[eventId] || null : null;
  }

  function isIntroPhase(phase) { return /^INTRO_[1-8]$/.test(phase || ""); }
  function introBeat(phase) { return isIntroPhase(phase) ? Number(String(phase).slice(6)) : 0; }
  function isDiscussionPhase(phase) { return /_DISCUSS$/.test(phase || ""); }
  function actionRound(phase) {
    if (phase === "ROUND1_ACTION") return 1;
    if (phase === "ROUND2_ACTION") return 2;
    if (phase === "ROUND3_ACTION") return 3;
    return 0;
  }

  function currentSeat() {
    return state && state.currentSeat ? state.currentSeat : null;
  }

  function selectedActionForCurrentSeat() {
    var seat = currentSeat();
    if (!seat) return null;
    if (draftActionPhase === state.phase) return draftAction;
    return seat.selectedAction;
  }

  function actionCountLabel() {
    if (!state || !state.seats) return "";
    var completed = state.seats.filter(function (seat) { return seat.completed; }).length;
    return completed + " / 3 已完成";
  }

  function statusMarkup() {
    if (!statusMessage) return "";
    return "<p class=\"" + (statusKind === "error" ? "error-note" : "success-note") + " data-status role=\"status\">" + escapeHtml(statusMessage) + "</p>";
  }

  function roomBannerMarkup() {
    return "<div class=\"room-banner\"><div><span class=\"eyebrow\">這場事件的代碼</span><div class=\"room-code\" data-room-code>" + escapeHtml(roomCode) + "</div><p class=\"room-help\">把這個代碼或連結給另外兩個人。</p></div><div><span class=\"eyebrow\">分享連結</span><a class=\"share-link\" data-share-link href=\"" + escapeHtml(makeShareUrl(roomCode)) + "\">開啟共同事件</a></div></div>";
  }

  function entryMarkup() {
    return "<section class=\"stage\" data-view=\"entry\"><p class=\"eyebrow\">海岬防洪站</p><h1>三個人，先把事件看清楚。</h1><p class=\"lead\">你們會各自接手一個角色，在同一場事件裡做三次有影響的決定，最後一起選擇中央隔離閘的動作。</p><div class=\"entry-grid\"><button type=\"button\" class=\"entry-card\" data-create><strong>建立事件</strong><span>建立一個六碼代碼，邀請另外兩個人加入。</span><small>不用帳號，也不用留下資料。</small></button><div class=\"entry-card\"><strong>加入事件</strong><span>輸入朋友給你的六碼代碼。</span><form class=\"join-form\" data-join-form><div class=\"join-row\"><input class=\"room-input\" data-room-input inputmode=\"text\" maxlength=\"6\" autocomplete=\"off\" placeholder=\"六碼代碼\" aria-label=\"六碼事件代碼\"><button type=\"submit\" class=\"primary-button\">加入</button></div></form></div></div>" + statusMarkup() + "</section>";
  }

  function seatStatusMarkup(seat) {
    if (!seat.occupied) return "等待加入";
    if (seat.started) return seat.connected ? "已接手" : "已接手，正在等這支手機回來";
    return seat.connected ? "已選，尚未接手" : "已選角色";
  }

  function seatsMarkup() {
    return "<div class=\"seat-list\" aria-label=\"三個角色\">" + (state && state.seats || []).map(function (seat) {
      return "<div class=\"seat-row\"><strong>" + escapeHtml(seat.roleLabel) + "</strong><span class=\"seat-status\">" + escapeHtml(seatStatusMarkup(seat)) + "</span></div>";
    }).join("") + "</div>";
  }

  function roleCardsMarkup() {
    var cards = ROLE_IDS.map(function (roleId) {
      var seat = (state.seats || []).find(function (item) { return item.roleId === roleId; });
      var occupied = seat && seat.occupied;
      var selected = selectedRole === roleId;
      return "<button type=\"button\" class=\"role-card" + (selected ? " is-selected" : "") + (occupied ? " is-occupied" : "") + "\" data-role-select=\"" + escapeHtml(roleId) + "\"" + (occupied ? " disabled" : "") + "><span class=\"role-mark\">" + (occupied ? "已有人接手" : "可接手") + "</span><strong>" + ROLE_LABELS[roleId] + "</strong><span>" + ROLE_DUTIES[roleId] + "</span><small>每回合都會有一個只有你能做的現場選擇。</small></button>";
    }).join("");
    return "<div class=\"role-grid\" role=\"list\" aria-label=\"選一個角色\">" + cards + "</div>";
  }

  function lobbyMarkup() {
    var canTakeover = Boolean(selectedRole) && !commandBusy;
    var audioLabel = state && state.audioMasterLabel ? state.audioMasterLabel : "第一個接手的角色";
    return "<section class=\"stage\" data-view=\"lobby\">" + roomBannerMarkup() + "<p class=\"eyebrow\">三人同房</p><h1>各自接手一個角色。</h1><p class=\"lead\">三個角色都有人接手，而且每個人都按下「接手角色」後，事件才會開始。</p>" + roleCardsMarkup() + seatsMarkup() + "<p class=\"speaker-note\"><strong>岬衛-7 播報：</strong>" + escapeHtml(audioLabel) + "。只負責播放聲音，不是隊長。</p><div class=\"actions\"><button type=\"button\" class=\"primary-button\" data-takeover" + (canTakeover ? "" : " disabled") + ">接手角色</button></div>" + statusMarkup() + "</section>";
  }

  function waitingMarkup(title, body) {
    return "<div class=\"update-card\"><p><strong>" + escapeHtml(title) + "</strong></p><p>" + escapeHtml(body) + "</p></div>";
  }

  function introVisual(beat) {
    if (beat === 5) return "<div class=\"update-card\"><p><strong>控制室</strong> 暫時無法確認兩人的狀態、路線與安全時間。</p></div>";
    if (beat === 6) return "<figure class=\"story-map\"><img src=\"assets/facility-map.svg\" alt=\"海岬防洪站簡圖，標出控制室、林芮、高承、中央隔離閘、西側救援軌道和海水與污染方向。\"><figcaption>海水與污染從東側靠近；西側救援軌道穿過中央隔離閘開口。</figcaption></figure>";
    var panel = INTRO_PANEL_MAP[beat];
    if (!panel) return "";
    var label = "";
    if (beat === 2) label = "<span class=\"visual-label\">林芮｜維修員｜高處避難台</span>";
    if (beat === 3) label = "<span class=\"visual-label\">高承｜閘門技師｜中央隔離閘東側</span>";
    if (beat === 7) label = "<span class=\"visual-label\">林芮｜救援軌道　↔　高承｜手動撐桿</span>";
    return "<figure class=\"story-image\"><img src=\"assets/storyboard/" + panel + "\" alt=\"" + escapeHtml(INTRO_HEADINGS[beat - 1]) + "\">" + label + "</figure>";
  }

  function trackMarkup() {
    if (!state || !state.shared || !state.shared.tracks) return "";
    var tracks = state.shared.tracks;
    var items = [
      ["救援進度", tracks.rescueProgress],
      ["中央隔離閘", tracks.gateStability],
      ["高承防護", tracks.gaoProtection],
      ["備用電力", tracks.backupPower]
    ];
    return "<div class=\"track-grid\" aria-label=\"現場狀態\">" + items.map(function (item) {
      return "<div class=\"track-card\"><span>" + item[0] + "</span><strong>" + escapeHtml(item[1]) + "</strong></div>";
    }).join("") + "</div>";
  }

  function phaseBarMarkup() {
    if (!state) return "";
    return "<div class=\"phase-bar\"><p><span class=\"eyebrow\">現在</span><strong>" + escapeHtml(state.phaseLabel || STAGE_LABELS[state.phase] || state.phase) + "</strong><small>" + escapeHtml(actionCountLabel()) + "</small></p><details class=\"map-reference\"><summary>查看我的資料與地圖</summary><figure><img src=\"assets/facility-map.svg\" alt=\"海岬防洪站設施簡圖。\"><figcaption class=\"muted\">海水與污染從東側靠近；西側救援軌道穿過中央隔離閘開口。</figcaption></figure></details></div>";
  }

  function voiceMarkup() {
    if (!state || !state.operatorEvent) return "";
    var event = state.operatorEvent;
    var row = rowForEvent(event.id);
    if (!row) return "";
    var master = state.audioMasterRole === currentRole;
    var acknowledged = Boolean(event.acknowledged);
    var caption = "<div class=\"caption-box\"><span class=\"caption-label\">字幕</span><p data-caption>" + escapeHtml(row.CAPTION_TEXT) + "</p></div>";
    var replay = row.AUDIO_FILE ? "<button type=\"button\" class=\"secondary-button\" data-replay-voice>重播</button>" : "";
    var masterNote = master ? "你目前負責播放聲音，不是隊長。" : (state.audioMasterLabel ? state.audioMasterLabel + " 負責播放聲音；所有人都會看到字幕。" : "所有人都會看到字幕。");
    var status = acknowledged ? "這段播報已完成。" : (master ? "播報會自動播放；若聲音失敗，字幕會在短時間後自動往下走。" : "等負責播放聲音的手機完成這段播報。字幕會一直保留。");
    return "<section class=\"voice-panel\" aria-label=\"字幕與聲音\">" + caption + "<p class=\"audio-status\">" + escapeHtml(masterNote) + "</p><div class=\"voice-actions\">" + replay + "</div><p class=\"audio-status\" data-audio-status>" + escapeHtml(status) + "</p></section>";
  }

  function currentPrivateResult() {
    var seat = currentSeat();
    if (!seat || !seat.private) return null;
    if (state.phase === "ROUND1_DISCUSS" || state.phase === "ROUND2_ACTION" || state.phase === "ROUND2_DISCUSS") return seat.private.round1;
    if (state.phase === "ROUND3_ACTION" || state.phase === "ROUND3_DISCUSS" || state.phase === "FINAL_VOTE" || state.phase === "ENDING") return seat.private.round1;
    return null;
  }

  function privateResultMarkup(result) {
    if (!result) return "";
    return "<section class=\"private-result\"><h3>只有你這支手機看到的查詢結果</h3><p class=\"result-line\"><strong>查到：</strong>" + escapeHtml(result.found) + "</p><p class=\"result-line\"><strong>仍不知道：</strong>" + escapeHtml(result.unknown) + "</p><p class=\"muted\">請用自己的話告訴隊友；其他手機不會直接看到這兩句。</p></section>";
  }

  function actionOptionsMarkup() {
    if (!state || !state.options || !state.options.length) return "";
    var seat = currentSeat();
    var selected = selectedActionForCurrentSeat();
    return "<div class=\"option-list\" role=\"listbox\" aria-label=\"目前可以做的選擇\">" + state.options.map(function (option) {
      var isSelected = selected === option.id;
      return "<button type=\"button\" class=\"option-card" + (isSelected ? " is-selected" : "") + "\" data-action-select=\"" + escapeHtml(option.id) + "\" aria-pressed=\"" + isSelected + "\"><strong>" + escapeHtml(option.label) + "</strong><span>" + escapeHtml(option.detail) + "</span></button>";
    }).join("") + "</div>";
  }

  function actionMarkup() {
    var round = actionRound(state.phase);
    var seat = currentSeat();
    var submitted = Boolean(seat && seat.completed);
    var heading = round === 1 ? "先查一件只有你負責的事。" : round === 2 ? "把剛才看到的狀況，變成一個現場做法。" : "這是最後窗口；你的選擇會改變最後留下的路。";
    var note = round === 1 ? "確認後，查到的結果只會先出現在這支手機；請再用自己的話告訴隊友。" : round === 2 ? "每個做法都有代價；確認前可以返回重選。" : "前兩回合留下的電力、路線和防護，會決定這裡能看到哪些做法。";
    var buttonLabel = round === 1 ? "確認查詢" : round === 2 ? "確認這個做法" : "確認最後窗口做法";
    var operatorReady = !state.operatorEvent || state.operatorEvent.acknowledged;
    var waitingForEscalation = round === 3 && !operatorReady;
    var selectedAction = selectedActionForCurrentSeat();
    var content = waitingForEscalation
      ? waitingMarkup("先聽完最後現場更新。", "播報完成後，這裡才會出現你的最後窗口做法。")
      : submitted ? waitingMarkup("這一回合你已經確認了。", "等另外兩個人完成；現場會由岬衛-7 播報下一段變化。") : actionOptionsMarkup() + "<p class=\"selection-note\">" + (selectedAction ? "已選一個做法；如果想換，請先返回重選。" : "先選一個做法，再確認。") + "</p><div class=\"actions\"><button type=\"button\" class=\"secondary-button\" data-clear-selection" + (selectedAction && !commandBusy ? "" : " disabled") + ">返回重選</button><button type=\"button\" class=\"primary-button\" data-confirm-action" + (selectedAction && !commandBusy ? "" : " disabled") + ">" + buttonLabel + "</button></div>";
    var escalationVoice = round === 3 ? voiceMarkup() : "";
    return "<section class=\"stage\" data-view=\"action\"><p class=\"eyebrow\">" + escapeHtml(STAGE_LABELS[state.phase]) + "</p><h1>" + escapeHtml(heading) + "</h1><p class=\"lead\">" + escapeHtml(note) + "</p>" + escalationVoice + trackMarkup() + (state.shared.latestUpdate ? "<div class=\"update-card\"><p>" + escapeHtml(state.shared.latestUpdate) + "</p></div>" : "") + content + statusMarkup() + "</section>";
  }

  function discussionMarkup() {
    var seat = currentSeat();
    var privateResult = privateResultMarkup(currentPrivateResult());
    var summary = state.phase === "ROUND1_DISCUSS" ? state.shared.round1Summary : state.phase === "ROUND2_DISCUSS" ? state.shared.round2Summary : state.shared.round3Summary;
    var operatorReady = !state.operatorEvent || state.operatorEvent.acknowledged;
    var readyText = state.phase === "ROUND1_DISCUSS" ? "我們把三個查詢都說完了" : "我們把這回合的代價都說完了";
    return "<section class=\"stage\" data-view=\"discussion\"><p class=\"eyebrow\">" + escapeHtml(STAGE_LABELS[state.phase]) + "</p><h1>先交換發現，再往下走。</h1>" + voiceMarkup() + privateResult + "<div class=\"discussion-prompt\">把你看到的、仍不知道的，以及你覺得哪個代價最重要的，告訴隊友。等三個人都說完，再各自按下面的按鈕。</div>" + (summary ? "<div class=\"update-card\"><p>" + escapeHtml(summary) + "</p></div>" : "") + "<button type=\"button\" class=\"primary-button wide\" data-ready" + (seat && !seat.ready && operatorReady && !commandBusy ? "" : " disabled") + ">" + readyText + "</button>" + (!operatorReady ? "<p class=\"audio-wait\">等播報完成後，再按準備好了。</p>" : "") + statusMarkup() + "</section>";
  }

  function finalVoteMarkup() {
    var seat = currentSeat();
    var selected = seat && seat.vote;
    var prompt = state.votePrompt || "先說清楚兩個代價，再各自選一個最後動作。";
    return "<section class=\"stage\" data-view=\"final-vote\"><p class=\"eyebrow\">一起選最後動作</p><h1>現在只決定中央隔離閘的最後動作。</h1><p class=\"lead\">兩個動作都會留下代價；最後結果還會受前三回合的救援進度、閘門穩定和高承防護影響。</p>" + trackMarkup() + "<div class=\"discussion-prompt\">" + escapeHtml(prompt) + "</div><div class=\"vote-list\" role=\"radiogroup\" aria-label=\"中央隔離閘的最後動作\"><button type=\"button\" class=\"vote-card" + (selected === "close" ? " is-selected" : "") + "\" data-vote=\"close\" aria-pressed=\"" + (selected === "close") + "\"><strong>現在關上中央隔離閘</strong><span>控制室和閘門較快穩住；西側救援軌道會失去供電。</span></button><button type=\"button\" class=\"vote-card" + (selected === "hold" ? " is-selected" : "") + "\" data-vote=\"hold\" aria-pressed=\"" + (selected === "hold") + "\"><strong>讓中央隔離閘再開 95 秒</strong><span>保留救援車的最後可能；高承和閘門會繼續承受東側逼近。</span></button></div><p class=\"selection-note\">" + (selected ? "你已選一個最後動作；三人若不一致，仍可返回重選。" : "先選一個最後動作，再和隊友比較。") + "</p>" + statusMarkup() + "</section>";
  }

  function endingMarkup() {
    var ending = state.ending;
    var row = state.operatorEvent ? rowForEvent(state.operatorEvent.id) : null;
    var consequence = row ? row.CAPTION_TEXT : "三人的最後動作已一致；等播報完成後讀取現場結果。";
    var reasons = ending && ending.reasons || [];
    return "<section class=\"stage ending-stage\" data-view=\"ending\"><p class=\"eyebrow\">事件結果</p><h1>事件結束</h1>" + voiceMarkup() + "<p class=\"ending-consequence\" data-consequence>" + escapeHtml(consequence) + "</p><h2>這次結果怎麼走到這裡</h2><ol class=\"causal-list\">" + reasons.map(function (reason) { return "<li>" + escapeHtml(reason) + "</li>"; }).join("") + "</ol><p class=\"ending-question\">如果要把這次的決定交給下一班人，你們最想提醒哪一件事？</p><button type=\"button\" class=\"secondary-button wide\" data-new-event>重新建立事件</button>" + statusMarkup() + "</section>";
  }

  function introMarkup() {
    var beat = introBeat(state.phase);
    var row = rowForEvent(state.operatorEvent && state.operatorEvent.id);
    var title = INTRO_HEADINGS[beat - 1] || "共同序幕";
    return "<section class=\"stage\" data-view=\"intro\" data-intro-beat=\"" + beat + "\"><div class=\"story-count\">共同序幕｜" + beat + " / 8</div><h1>" + escapeHtml(title) + "</h1>" + introVisual(beat) + "<div class=\"intro-caption\"><p>" + escapeHtml(row ? row.CAPTION_TEXT : "") + "</p></div>" + voiceMarkup() + "<p class=\"audio-wait\">" + (state.operatorEvent && state.operatorEvent.acknowledged ? "這段共同序幕已完成。" : "播報完成後會自動進入下一段；不用由任何一個人帶隊。") + "</p>" + statusMarkup() + "</section>";
  }

  function connectedRoomMarkup() {
    if (isIntroPhase(state.phase)) return introMarkup();
    if (state.phase === "ROUND1_ACTION" || state.phase === "ROUND2_ACTION" || state.phase === "ROUND3_ACTION") return actionMarkup();
    if (isDiscussionPhase(state.phase)) return discussionMarkup();
    if (state.phase === "FINAL_VOTE") return finalVoteMarkup();
    if (state.phase === "ENDING") return endingMarkup();
    return "<section class=\"stage\"><p class=\"eyebrow\">等待三人</p><h1>接手角色後，事件會從這裡開始。</h1>" + roomBannerMarkup() + roleCardsMarkup() + seatsMarkup() + "<div class=\"actions\"><button type=\"button\" class=\"primary-button\" data-takeover" + (selectedRole && !commandBusy ? "" : " disabled") + ">接手角色</button></div>" + statusMarkup() + "</section>";
  }

  function render() {
    if (!root) return;
    if (!roomCode) {
      root.innerHTML = entryMarkup();
    } else if (!state || !currentRole || !state.currentSeat) {
      root.innerHTML = state ? lobbyMarkup() : "<section class=\"stage\"><p class=\"eyebrow\">共同事件</p><h1>正在準備這場事件。</h1>" + statusMarkup() + "</section>";
    } else if (state.phase === "LOBBY" && !state.currentSeat.started) {
      root.innerHTML = lobbyMarkup();
    } else {
      root.innerHTML = phaseBarMarkup() + connectedRoomMarkup();
    }
    bindAudioAndAutoplay();
  }

  function setAudioStatus(message) {
    var node = document.querySelector("[data-audio-status]");
    if (node) node.textContent = message;
  }

  function ensureAudioElement() {
    if (operatorAudio && document.body.contains(operatorAudio)) return operatorAudio;
    operatorAudio = document.createElement("audio");
    operatorAudio.hidden = true;
    operatorAudio.preload = "auto";
    operatorAudio.className = "operator-audio";
    operatorAudio.setAttribute("data-audio-persistent", "true");
    operatorAudio.setAttribute("aria-hidden", "true");
    document.body.appendChild(operatorAudio);
    return operatorAudio;
  }

  function audioElement() {
    return operatorAudio && document.body.contains(operatorAudio) ? operatorAudio : null;
  }

  function setAudioSource(audio, row) {
    if (!audio || !row || !row.AUDIO_FILE) return;
    var source = missingAudio ? "assets/audio/not-present.mp3" : row.AUDIO_FILE;
    var absolute = new URL(source, document.baseURI).href;
    if (audio.src !== absolute) audio.src = absolute;
  }

  function sendOperatorComplete(eventId) {
    if (!state || !state.operatorEvent || state.operatorEvent.id !== eventId || state.operatorEvent.acknowledged) return;
    var key = audioKey(eventId);
    if (audioCompleteSent[key]) return;
    if (state.audioMasterRole !== currentRole) return;
    audioCompleteSent[key] = true;
    sendCommand({ type: "COMPLETE_OPERATOR", eventId: eventId });
  }

  function scheduleAudioFallback(eventId, delay) {
    clearAudioTimer();
    audioTimer = window.setTimeout(function () {
      sendOperatorComplete(eventId);
    }, delay || AUDIO_FALLBACK_MS);
  }

  function unlockAudio() {
    audioUnlocked = true;
    var audio = ensureAudioElement();
    audioEventBinding = null;
    audio.onended = null;
    audio.onerror = null;
    var roleRow = rowForEvent("A8_ROLE_START");
    setAudioSource(audio, roleRow);
    try {
      audio.muted = true;
      var result = audio.play();
      if (result && typeof result.then === "function") {
        result.then(function () {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = !audioEnabled;
        }).catch(function () {
          audio.muted = !audioEnabled;
        });
      }
    } catch (_error) {
      audio.muted = !audioEnabled;
    }
  }

  function playCurrentVoice(replay) {
    var audio = audioElement() || ensureAudioElement();
    var row = rowForEvent(state && state.operatorEvent && state.operatorEvent.id);
    if (!audio || !row || !row.AUDIO_FILE) return;
    setAudioSource(audio, row);
    audio.muted = !audioEnabled;
    if (!audioEnabled) {
      setAudioStatus("聲音已關閉；字幕仍保留。");
      return;
    }
    try {
      if (replay) audio.currentTime = 0;
      var result = audio.play();
      if (result && typeof result.catch === "function") result.catch(function () {
        setAudioStatus("聲音暫時無法播放；字幕會保留，並自動繼續。");
        scheduleAudioFallback(row.DIALOGUE_ID, AUDIO_FALLBACK_MS);
      });
    } catch (_error) {
      setAudioStatus("聲音暫時無法播放；字幕會保留，並自動繼續。");
      scheduleAudioFallback(row.DIALOGUE_ID, AUDIO_FALLBACK_MS);
    }
  }

  function bindAudioAndAutoplay() {
    if (!state || !state.operatorEvent) {
      clearAudioTimer();
      audioEventBinding = null;
      return;
    }
    var audio = audioElement() || ensureAudioElement();
    var eventId = state.operatorEvent.id;
    var row = rowForEvent(eventId);
    if (!row) return;
    var previousEventId = audioEventBinding;
    if (previousEventId && previousEventId !== eventId) clearAudioTimer();
    audioEventBinding = eventId;
    setAudioSource(audio, row);
    audio.muted = !audioEnabled;
    audio.onended = function () { sendOperatorComplete(eventId); };
    audio.onerror = function () {
      setAudioStatus("聲音暫時無法播放；字幕會保留，並自動繼續。");
      if (state.audioMasterRole === currentRole && !state.operatorEvent.acknowledged) scheduleAudioFallback(eventId, AUDIO_FALLBACK_MS);
    };
    var isMaster = state.audioMasterRole === currentRole;
    if (!isMaster || state.operatorEvent.acknowledged) {
      if (state.operatorEvent.acknowledged) clearAudioTimer();
      return;
    }
    if (previousEventId !== eventId || !audioTimer) scheduleAudioFallback(eventId, AUDIO_FALLBACK_MS);
    var key = audioKey(eventId);
    if (audioAttempted[key]) return;
    audioAttempted[key] = true;
    lastRenderedAudioId = eventId;
    if (audioUnlocked && audioEnabled && row.AUDIO_FILE) playCurrentVoice(false);
  }

  function commandPayload(extra) {
    return Object.assign({
      roleId: currentRole,
      token: roleToken(currentRole),
      phase: state && state.phase,
      version: state && state.version
    }, extra || {});
  }

  function sendCommand(extra) {
    if (!socket || socket.readyState !== 1 || !state || !currentRole || commandBusy) return false;
    commandBusy = true;
    pendingCommand = commandPayload(extra);
    try {
      socket.send(JSON.stringify(pendingCommand));
      return true;
    } catch (_error) {
      commandBusy = false;
      pendingCommand = null;
      setStatus("這次動作沒有送出，請再試一次。", "error");
      render();
      return false;
    }
  }

  function finishCommand() {
    commandBusy = false;
    pendingCommand = null;
  }

  function friendlyError(code) {
    return {
      ROOM_NOT_FOUND: "找不到這個事件代碼。",
      EXPIRED_ROOM: "這個事件已經過期，請重新建立事件。",
      OCCUPIED_ROLE: "這個角色已經有人接手，請換一個角色。",
      SEAT_ALREADY_CONNECTED: "這個角色正在另一支手機上使用；重新連線後會接回原本進度。",
      TOKEN_MISMATCH: "這支手機的角色連結已失效，請重新加入原本的角色。",
      STALE_PHASE: "事件剛剛往下走了，畫面正在更新。",
      STALE_VERSION: "畫面剛剛更新，請依照目前畫面再做一次。",
      FUTURE_PHASE: "這個動作還沒到可以做的時候。",
      FUTURE_VERSION: "這個畫面還沒有發生。",
      DUPLICATE_ACTION: "這個動作已經確認過了。",
      OPERATOR_PENDING: "先等這段播報完成，再繼續。",
      NOT_AUDIO_MASTER: "目前由另一支手機負責播放這段聲音。",
      WRONG_OPERATOR_EVENT: "這段播報已經換了，畫面正在更新。",
      MALFORMED_ACTION: "請從目前畫面上的選項重新選一次。",
      MALFORMED_COMMAND: "這個動作資料不完整，請再試一次。"
    }[code] || "這場事件暫時無法完成這個動作。";
  }

  function handleState(nextState) {
    if (!nextState || !nextState.phase) return;
    var pendingDraft = draftAction;
    var pendingDraftPhase = draftActionPhase;
    if (nextState.roomCode && nextState.roomCode !== roomCode) {
      resetAudioRoomScope(nextState.roomCode);
      roomCode = nextState.roomCode;
    }
    state = nextState;
    if (pendingDraft && pendingDraftPhase === state.phase && state.currentSeat && !state.currentSeat.completed) {
      draftAction = pendingDraft;
      draftActionPhase = pendingDraftPhase;
    } else {
      draftAction = null;
      draftActionPhase = null;
    }
    finishCommand();
    setStatus("", "");
    if (state.currentSeat && state.currentSeat.roleId) {
      currentRole = state.currentSeat.roleId;
      selectedRole = currentRole;
      setStored("last-role", currentRole);
    }
    render();
    if (isIntroPhase(state.phase) || state.operatorEvent) scrollTop();
  }

  function handleSocketMessage(event) {
    var payload;
    try { payload = JSON.parse(event.data); } catch (_error) { return; }
    if (payload.type === "WELCOME") {
      if (payload.token) saveRoleToken(payload.roleId, payload.token);
      reconnectAttempts = 0;
      handleState(payload.state);
      if (pendingTakeover && payload.state.currentSeat && !payload.state.currentSeat.started && payload.state.phase === "LOBBY") {
        pendingTakeover = false;
        sendCommand({ type: "TAKEOVER" });
      } else {
        pendingTakeover = false;
      }
      return;
    }
    if (payload.type === "STATE") {
      handleState(payload.state);
      return;
    }
    if (payload.type === "ERROR") {
      finishCommand();
      if (payload.code === "TOKEN_MISMATCH") removeStored("token:" + currentRole);
      setStatus(friendlyError(payload.code), "error");
      render();
      return;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || !roomCode || !currentRole || !roleToken(currentRole)) return;
    if (reconnectAttempts >= 8) {
      setStatus("連線暫時中斷；請重新整理這支手機。", "error");
      render();
      return;
    }
    var wait = Math.min(4000, 400 + reconnectAttempts * 450);
    reconnectAttempts += 1;
    reconnectTimer = window.setTimeout(function () {
      reconnectTimer = null;
      connectSocket(false);
    }, wait);
  }

  function connectSocket(afterTakeover) {
    if (!roomCode || !currentRole) return;
    if (socket && (socket.readyState === 0 || socket.readyState === 1)) return;
    var token = roleToken(currentRole);
    var query = new URLSearchParams({ role: currentRole });
    if (token) query.set("token", token);
    var url = wsBaseUrl() + "/rooms/" + encodeURIComponent(roomCode) + "/ws?" + query.toString();
    try {
      socket = new WebSocket(url);
    } catch (_error) {
      setStatus("目前無法連上這場事件。", "error");
      render();
      scheduleReconnect();
      return;
    }
    pendingTakeover = Boolean(afterTakeover);
    socket.addEventListener("open", function () {
      setStatus("", "");
      render();
    });
    socket.addEventListener("message", handleSocketMessage);
    socket.addEventListener("error", function () {
      setStatus("連線暫時不穩，正在接回這支手機。", "error");
      render();
    });
    socket.addEventListener("close", function () {
      socket = null;
      finishCommand();
      if (state && state.phase !== "ENDING") {
        setStatus("連線暫時中斷，正在接回原本的角色和進度。", "error");
        render();
        scheduleReconnect();
      }
    });
  }

  function loadSnapshot(code, callback) {
    fetch(workerBaseUrl() + "/rooms/" + encodeURIComponent(code))
      .then(function (response) {
        return response.json().then(function (payload) { return { ok: response.ok, payload: payload }; });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.payload.error || "ROOM_NOT_FOUND");
        resetAudioRoomScope(code);
        roomCode = code;
        updateUrl(code);
        state = result.payload;
        setStatus("", "");
        var lastRole = getStored("last-role");
        var rememberedSeat = lastRole && ROLE_IDS.indexOf(lastRole) >= 0 ? result.payload.seats.find(function (seat) { return seat.roleId === lastRole && seat.occupied; }) : null;
        if (rememberedSeat && roleToken(lastRole)) {
          currentRole = lastRole;
          selectedRole = lastRole;
          connectSocket(false);
        }
        render();
        if (callback) callback(result.payload);
      })
      .catch(function (error) {
        setStatus(friendlyError(error.message), "error");
        render();
        if (callback) callback(null, error);
      });
  }

  function createRoom() {
    setStatus("正在建立事件……", "success");
    render();
    fetch(workerBaseUrl() + "/rooms", { method: "POST" })
      .then(function (response) {
        return response.json().then(function (payload) { return { ok: response.ok, payload: payload }; });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.payload.error || "CREATE_FAILED");
        loadSnapshot(result.payload.roomCode);
      })
      .catch(function () {
        setStatus("目前無法建立事件，請稍後再試。", "error");
        render();
      });
  }

  function normalizeRoomCode(value) {
    return String(value || "").toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, "").slice(0, 6);
  }

  function joinRoom(value) {
    var code = normalizeRoomCode(value);
    if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
      setStatus("請輸入六碼事件代碼。", "error");
      render();
      return;
    }
    setStatus("正在加入事件……", "success");
    render();
    loadSnapshot(code);
  }

  function selectRole(roleId) {
    if (ROLE_IDS.indexOf(roleId) < 0) return;
    selectedRole = roleId;
    setStatus("", "");
    render();
  }

  function takeOver() {
    if (!selectedRole || commandBusy) return;
    currentRole = selectedRole;
    audioEnabled = getStored("audio") !== "off";
    unlockAudio();
    setStored("last-role", currentRole);
    if (socket && socket.readyState === 1) {
      pendingTakeover = true;
      sendCommand({ type: "TAKEOVER" });
    } else {
      connectSocket(true);
    }
    setStatus("正在接手角色……", "success");
    render();
  }

  function clearSelection() {
    if (!state || !currentSeat() || commandBusy) return;
    draftAction = null;
    draftActionPhase = null;
    state.currentSeat.selectedAction = null;
    render();
  }

  function confirmAction() {
    var seat = currentSeat();
    var selectedAction = selectedActionForCurrentSeat();
    if (!seat || !selectedAction || commandBusy) return;
    sendCommand({ type: "ACTION", actionId: selectedAction });
  }

  function bindClick(event) {
    var target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-create]")) { createRoom(); return; }
    if (target.matches("[data-role-select]")) { selectRole(target.getAttribute("data-role-select")); return; }
    if (target.matches("[data-takeover]")) { takeOver(); return; }
    if (target.matches("[data-action-select]")) {
      if (currentSeat() && !currentSeat().completed) {
        draftAction = target.getAttribute("data-action-select");
        draftActionPhase = state.phase;
        render();
      }
      return;
    }
    if (target.matches("[data-clear-selection]")) { clearSelection(); return; }
    if (target.matches("[data-confirm-action]")) { confirmAction(); return; }
    if (target.matches("[data-ready]")) { sendCommand({ type: "READY" }); return; }
    if (target.matches("[data-vote]")) { sendCommand({ type: "VOTE", vote: target.getAttribute("data-vote") }); return; }
    if (target.matches("[data-replay-voice]")) { playCurrentVoice(true); return; }
    if (target.matches("[data-new-event]")) {
      if (socket) { try { socket.close(1000, "new event"); } catch (_error) {} }
      resetAudioRoomScope(null);
      roomCode = null;
      state = null;
      currentRole = null;
      selectedRole = null;
      setStatus("", "");
      updateUrl("");
      render();
    }
  }

  function bindInput(event) {
    if (event.target.matches("[data-room-input]")) event.target.value = normalizeRoomCode(event.target.value);
  }

  function bindSubmit(event) {
    if (!event.target.matches("[data-join-form]")) return;
    event.preventDefault();
    joinRoom(event.target.querySelector("[data-room-input]").value);
  }

  function bootstrap() {
    document.addEventListener("click", bindClick);
    document.addEventListener("input", bindInput);
    document.addEventListener("submit", bindSubmit);
    var queryRoom = normalizeRoomCode(new URLSearchParams(window.location.search).get("room"));
    audioEnabled = getStored("audio") !== "off";
    if (queryRoom) {
      roomCode = queryRoom;
      loadSnapshot(queryRoom);
    } else {
      render();
    }
  }

  global.__MOMEY_A8__ = {
    DIALOGUE: DIALOGUE,
    DIALOGUE_BY_ID: DIALOGUE_BY_ID,
    ROLE_IDS: ROLE_IDS,
    ROLE_LABELS: ROLE_LABELS,
    INTRO_HEADINGS: INTRO_HEADINGS,
    INTRO_PANEL_MAP: INTRO_PANEL_MAP,
    getState: function () { return state; },
    getCurrentRole: function () { return currentRole; },
    getRoomCode: function () { return roomCode; },
    getAudioElementForTest: function () { return audioElement(); },
    getAudioAttemptedForTest: function () { return Object.keys(audioAttempted); },
    getAudioCompleteSentForTest: function () { return Object.keys(audioCompleteSent); },
    closeSocketForTest: function () { if (socket) { try { socket.close(1000, "test reconnect"); } catch (_error) {} } },
    workerBaseUrl: workerBaseUrl,
    makeShareUrl: makeShareUrl,
    normalizeRoomCode: normalizeRoomCode,
    introVisual: introVisual,
    render: render,
    rowForEvent: rowForEvent,
    setStateForTest: function (nextState, roleId, code) { state = nextState; roomCode = code || roomCode || "ABC234"; currentRole = roleId || currentRole; selectedRole = currentRole; render(); },
    unlockAudioForTest: unlockAudio,
    testHook: testHook,
    audioFallbackMs: AUDIO_FALLBACK_MS,
    getLastRenderedAudioId: function () { return lastRenderedAudioId; }
  };

  bootstrap();
})(window);
