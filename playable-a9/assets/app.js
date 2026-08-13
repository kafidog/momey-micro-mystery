(function (global) {
  "use strict";

  var root = document.getElementById("app");
  var operatorAudio = document.getElementById("operator-audio");
  var DIALOGUE = global.MOMEY_A9_DIALOGUE || {};
  var ROLE_IDS = ["operations", "rescue", "safety"];
  var ROLE_LABELS = { operations: "現場調度", rescue: "救援聯絡", safety: "結構安全" };
  var ROLE_DUTIES = {
    operations: "切換備用電力，最後拉下中央隔離閘。",
    rescue: "按住推進救援車，確認林芮越界並固定。",
    safety: "按住支撐閘門，管理高承防護與後撤。"
  };
  var PHASE_LABELS = { LOBBY: "等待接手", INTRO: "事件開始", TRAINING: "控制測試", WINDOW1: "第一操作窗口", INTERLUDE: "第二波前", WINDOW2: "第二操作窗口", FINAL: "最後協作窗口", OUTCOME: "事件結果" };
  var query = new URLSearchParams(location.search);
  var workerBaseUrl = String(query.get("worker") || "https://momey-playable-a9-room.momey-micro-mystery.workers.dev").replace(/\/$/, "");
  var audioFallbackMs = Math.max(50, Number(query.get("audioFallbackMs")) || 15000);
  var missingAudio = query.get("missingAudio") === "1";
  var state = null;
  var roomCode = null;
  var currentRole = null;
  var selectedRole = null;
  var socket = null;
  var commandInFlight = false;
  var pendingCommand = null;
  var queuedCommand = null;
  var commandSerial = 0;
  var pendingTakeover = false;
  var reconnectTimer = null;
  var reconnectAttempts = 0;
  var statusText = "";
  var statusKind = "";
  var heldControl = null;
  var trainingHeldAt = 0;
  var audioUnlocked = false;
  var audioAttempted = Object.create(null);
  var audioCompleted = Object.create(null);
  var audioFallbackTimer = null;
  var boundAudioEvent = null;
  var clockOffset = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]; });
  }

  function storageKey(name) { return "momey-a9:" + (roomCode || "none") + ":" + name; }
  function getStored(name) { try { return localStorage.getItem(storageKey(name)); } catch { return null; } }
  function setStored(name, value) { try { localStorage.setItem(storageKey(name), value); } catch {} }
  function roleToken(roleId) { return getStored("token:" + roleId); }

  function setStatus(text, kind) { statusText = text || ""; statusKind = kind || ""; }
  function statusMarkup() { return '<p class="status ' + escapeHtml(statusKind) + '" role="status">' + escapeHtml(statusText) + "</p>"; }

  function normalizeRoomCode(value) { return String(value || "").toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, "").slice(0, 6); }
  function shareUrl(code) { var url = new URL(location.href); url.search = ""; url.searchParams.set("room", code); return url.toString(); }
  function wsUrl(code, roleId, token) { var url = new URL(workerBaseUrl + "/rooms/" + code + "/ws"); url.protocol = url.protocol === "https:" ? "wss:" : "ws:"; url.searchParams.set("role", roleId); if (token) url.searchParams.set("token", token); return url.toString(); }

  function entryMarkup() {
    return '<section class="stage" data-view="entry"><p class="eyebrow">海岬防洪站</p><h1>三支手機，控制同一場救援。</h1><p class="lead">一人切電、一人推救援車、一人撐住閘門。另一支手機的動作會立刻改變你能做的事。</p><div class="stack"><button class="primary" type="button" data-create>建立事件</button><div class="panel"><h2>加入事件</h2><form class="stack" data-join-form><label for="room-input">輸入朋友給你的六碼代碼</label><input id="room-input" name="room" maxlength="6" autocomplete="off" inputmode="text" placeholder="六碼代碼"><button class="secondary" type="submit">加入</button></form></div></div>' + statusMarkup() + "</section>";
  }

  function seatRows() {
    return '<div class="seat-list">' + (state?.seats || []).map(function (seat) { return '<div class="seat-row"><strong>' + escapeHtml(seat.roleLabel) + '</strong><span>' + (seat.started ? (seat.connected ? "已接手" : "重新連線中") : seat.occupied ? "已選角色" : "等待加入") + "</span></div>"; }).join("") + "</div>";
  }

  function roleCards() {
    return '<div class="roles">' + ROLE_IDS.map(function (roleId) {
      var info = (state?.seats || []).find(function (seat) { return seat.roleId === roleId; });
      var own = currentRole === roleId;
      var occupied = info?.occupied && !own;
      return '<button type="button" class="role-button' + (selectedRole === roleId ? " is-selected" : "") + (occupied ? " is-occupied" : "") + '" data-role-select="' + roleId + '"' + (occupied ? " disabled" : "") + '><strong>' + ROLE_LABELS[roleId] + '</strong><span>' + ROLE_DUTIES[roleId] + "</span></button>";
    }).join("") + "</div>";
  }

  function lobbyMarkup() {
    var started = state?.currentSeat?.started;
    var audioLabel = state?.audioMasterLabel || "第一支接手的手機";
    return '<section class="stage" data-view="lobby"><p class="eyebrow">事件代碼</p><div class="room-code" data-room-code>' + escapeHtml(roomCode) + '</div><p><button class="secondary" type="button" data-share>複製加入連結</button></p><h1>' + (started ? "等待另外兩個控制席。" : "選一個你要操作的系統。") + "</h1>" + (started ? seatRows() : roleCards() + seatRows() + '<button class="primary" type="button" data-takeover' + (selectedRole && !commandInFlight ? "" : " disabled") + '>接手這個控制席</button>') + '<p class="lead">岬衛-7 播報：' + escapeHtml(audioLabel) + "。只負責播放聲音，不是隊長。</p>" + statusMarkup() + "</section>";
  }

  function voiceMarkup() {
    var event = state?.operatorEvent;
    if (!event) return "";
    var master = state.audioMasterRole === currentRole;
    return '<section class="voice"><div class="caption-label">岬衛-7 字幕</div><p data-caption>' + escapeHtml(event.caption || DIALOGUE[event.id]?.caption || "") + '</p><p class="lead">' + (master ? "這支手機負責播放聲音，不是隊長。" : escapeHtml((state.audioMasterLabel || "另一支手機") + " 負責播放；字幕會一直保留。")) + '</p><button class="secondary" type="button" data-replay>重播</button></section>';
  }

  function introMarkup() {
    return '<section class="stage" data-view="intro"><p class="eyebrow">共同事件</p><h1>林芮在西側，高承守著中央隔離閘。</h1><img class="facility-map" src="assets/facility-map.svg" alt="海岬防洪站簡圖：西側救援軌道連到中央隔離閘，高承在閘門東側。"><p class="lead">三個人各自控制不同設備；不用隱瞞資訊，看到關鍵訊號就直接告訴隊友。</p>' + voiceMarkup() + '<p class="signal">播報完成後，三支手機會同時進入安全控制測試。</p>' + statusMarkup() + "</section>";
  }

  function trainingMarkup() {
    var trained = state?.currentSeat?.trained;
    var copy = {
      operations: ["測試切電開關", "按住測試：感覺三個電力位置"],
      rescue: ["測試救援車推進", "按住測試：放開就會停止"],
      safety: ["測試閘門支撐", "按住測試：放開就能恢復力量"]
    }[currentRole] || ["測試控制", "按住測試"];
    return '<section class="stage" data-view="training"><p class="eyebrow">安全控制測試</p><h1>' + escapeHtml(copy[0]) + '</h1><p class="lead">不用讀長規則。先用手指按住一次你真正會操作的控制。</p><div class="instrument"><button type="button" class="hold-control training-control' + (trained ? " is-held" : "") + '" data-training-hold' + (trained ? " disabled" : "") + '>' + (trained ? "這支手機已準備" : escapeHtml(copy[1])) + '</button></div><div class="event-strip">' + (state.seats.filter(function (seat) { return seat.trained; }).length) + ' / 3 個控制席已完成測試</div>' + statusMarkup() + "</section>";
  }

  function meter(label, value, suffix, kind) {
    var bounded = Math.max(0, Math.min(100, Number(value) || 0));
    return '<div class="meter"><div class="meter-label"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(Math.round(Number(value) || 0) + (suffix || "%")) + '</strong></div><div class="meter-track"><div class="meter-fill ' + escapeHtml(kind || "") + '" style="--value:' + bounded + '%"></div></div></div>';
  }

  function commonLiveHead() {
    return '<div class="phase-head"><div class="phase-row"><div><p class="eyebrow">' + escapeHtml(PHASE_LABELS[state.phase]) + '</p><strong>' + escapeHtml(ROLE_LABELS[currentRole]) + '</strong></div><div class="timer" data-timer>' + escapeHtml(state.shared.timerLabel || "") + '</div></div></div><div class="coarse"><div><small>救援車</small><strong>' + escapeHtml(state.shared.trolley) + '</strong></div><div><small>閘門</small><strong>' + escapeHtml(state.shared.pressure) + '</strong></div><div><small>電力</small><strong>' + escapeHtml(state.shared.power) + '</strong></div></div><div class="event-strip" data-major-event>' + escapeHtml(state.shared.latestMajorEvent) + "</div>" + voiceMarkup();
  }

  function operationsInstrument(control) {
    var power = ['<div class="power-switch" role="group" aria-label="備用電力路由">', ["gate", "balanced", "rail"].map(function (mode) { var label = { gate: "閘門", balanced: "平衡", rail: "救援軌道" }[mode]; return '<button type="button" class="power-button' + (control.powerMode === mode ? " is-active" : "") + '" data-power="' + mode + '">' + label + "</button>"; }).join(""), "</div>"].join("");
    var final = state.phase === "FINAL" ? '<div class="signal ' + (control.leverResistance === "負載可控" ? "" : "warn") + '">機械負載：' + escapeHtml(control.leverResistance) + '（不代表人員已就位）</div>' + meter("關閘進度", control.closeProgressExact, "%", control.closeProgressExact > 70 ? "warn" : "") + '<button type="button" class="hold-control danger-control" data-hold-start="CLOSE_START" data-hold-stop="CLOSE_STOP">按住拉下中央隔離閘</button>' : "";
    return '<div class="instrument" data-instrument="operations"><div class="instrument-title"><h2>備用電力路由</h2><strong>' + Math.round(control.backupPowerExact) + '%</strong></div>' + power + '<div class="signal">支撐：' + escapeHtml(control.safetySupportCoarse) + "</div>" + final + "</div>";
  }

  function rescueInstrument(control) {
    var heatKind = control.heatExact >= 80 ? "danger" : control.heatExact >= 60 ? "warn" : "";
    var final = state.phase === "FINAL" ? '<div class="signal ' + (control.linBoundaryExact ? "" : "warn") + '">' + (control.linBoundaryExact ? "林芮已越過安全界線" : "林芮還沒越過安全界線") + '</div><button type="button" class="action-control" data-command="SECURE_TROLLEY"' + (control.linBoundaryExact && !control.secured ? "" : " disabled") + '>' + (control.secured ? "救援車已固定" : "固定救援車與林芮") + "</button>" : "";
    return '<div class="instrument" data-instrument="rescue"><div class="instrument-title"><h2>西側救援車</h2><strong>第 ' + control.checkpointExact + ' 標記</strong></div>' + meter("精確位置", control.positionExact, "%", "") + meter("馬達溫度", control.heatExact, "%", heatKind) + '<div class="signal ' + (control.railPowered ? "" : "danger") + '">' + (control.railPowered ? "軌道有電，可以推進" : "軌道無電，快告訴現場調度") + '</div><button type="button" class="hold-control" data-hold-start="TROLLEY_START" data-hold-stop="TROLLEY_STOP"' + (control.railPowered && control.heatExact < 94 && !control.secured ? "" : " disabled") + '>按住讓救援車前進<br><small>放開就停止／降溫</small></button>' + final + "</div>";
  }

  function safetyInstrument(control) {
    var pressureKind = control.pressureExact >= 82 ? "danger" : control.pressureExact >= 62 ? "warn" : "";
    var shield = state.phase === "WINDOW2" && control.shieldAvailable ? '<button type="button" class="action-control" data-command="DEPLOY_SHIELD">升起一次防濺屏</button>' : control.shieldDeployed ? '<div class="signal">防濺屏已升起</div>' : "";
    var final = state.phase === "FINAL" ? '<button type="button" class="action-control" data-command="RETREAT_GAO"' + (control.gaoRetreated ? " disabled" : "") + '>' + (control.gaoRetreated ? "高承已後撤" : "命令高承後撤（會失去支撐）") + "</button>" : "";
    return '<div class="instrument" data-instrument="safety"><div class="instrument-title"><h2>中央隔離閘支撐</h2><strong>' + escapeHtml(control.pressureTrend) + '</strong></div>' + meter("精確壓力", control.pressureExact, "%", pressureKind) + meter("支撐力量", control.braceStaminaExact, "%", control.braceStaminaExact < 25 ? "warn" : "") + meter("高承暴露", control.gaoExposureExact, "%", control.gaoExposureExact >= 65 ? "danger" : "") + '<div class="signal ' + (control.braceStableExact ? "" : "warn") + '">' + (control.braceStableExact ? "目前在安全支撐帶" : "支撐尚未進入安全帶") + '</div><button type="button" class="hold-control" data-hold-start="BRACE_START" data-hold-stop="BRACE_STOP"' + (control.braceStaminaExact >= 8 && !control.gaoRetreated ? "" : " disabled") + '>按住撐住閘門<br><small>放開就恢復力量</small></button>' + shield + final + "</div>";
  }

  function liveMarkup() {
    var objective = { operations: "切換電力，聽隊友的界線與壓力訊號。", rescue: "有電時推進；把精確標記與界線喊給隊友。", safety: "守住壓力，告訴隊友何時能關閘。" }[currentRole];
    var instrument = currentRole === "operations" ? operationsInstrument(state.control) : currentRole === "rescue" ? rescueInstrument(state.control) : safetyInstrument(state.control);
    return '<section class="stage" data-view="live" data-phase="' + state.phase + '">' + commonLiveHead() + '<p class="lead">' + escapeHtml(objective) + "</p>" + instrument + statusMarkup() + "</section>";
  }

  function interludeMarkup() {
    return '<section class="stage" data-view="interlude"><p class="eyebrow">第一段留下的狀態不會重設</p><h1>第二波正在逼近。</h1><div class="coarse"><div><small>救援車</small><strong>' + escapeHtml(state.shared.trolley) + '</strong></div><div><small>閘門</small><strong>' + escapeHtml(state.shared.pressure) + '</strong></div><div><small>電力</small><strong>' + escapeHtml(state.shared.power) + '</strong></div></div>' + voiceMarkup() + statusMarkup() + "</section>";
  }

  function outcomeMarkup() {
    var outcome = state.outcome || { causal: [] };
    return '<section class="stage" data-view="outcome"><p class="eyebrow">事件結果</p><h1>這次操作已結束。</h1>' + voiceMarkup() + '<div class="panel"><h2>三個控制怎麼把結果推到這裡</h2><ol class="outcome-list">' + (outcome.causal || []).map(function (row) { return "<li>" + escapeHtml(row) + "</li>"; }).join("") + '</ol></div><button class="secondary" type="button" data-new-event>重新建立事件</button>' + statusMarkup() + "</section>";
  }

  function render() {
    if (!roomCode) root.innerHTML = entryMarkup();
    else if (!state || state.phase === "LOBBY") root.innerHTML = lobbyMarkup();
    else if (state.phase === "INTRO") root.innerHTML = introMarkup();
    else if (state.phase === "TRAINING") root.innerHTML = trainingMarkup();
    else if (state.phase === "INTERLUDE") root.innerHTML = interludeMarkup();
    else if (state.phase === "OUTCOME") root.innerHTML = outcomeMarkup();
    else root.innerHTML = liveMarkup();
    syncHeldClass();
    syncAudio();
    updateTimer();
  }

  function handleState(next) {
    if (!next || !next.phase) return;
    state = next;
    clockOffset = Date.now() - Number(next.serverNow || Date.now());
    if (next.currentSeat?.roleId) { currentRole = next.currentSeat.roleId; selectedRole = currentRole; setStored("last-role", currentRole); }
    setStatus("", "");
    render();
    flushQueued();
  }

  function sendRaw(extra) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !state || !currentRole) return false;
    commandInFlight = true;
    pendingCommand = extra;
    commandSerial += 1;
    socket.send(JSON.stringify({ roleId: currentRole, token: roleToken(currentRole), phase: state.phase, version: state.version, commandId: currentRole + "-" + commandSerial, ...extra }));
    return true;
  }

  function sendCommand(command, priority) {
    if (commandInFlight) { queuedCommand = command; return false; }
    return sendRaw(command);
  }

  function flushQueued() {
    if (commandInFlight || !queuedCommand) return;
    var next = queuedCommand;
    queuedCommand = null;
    sendRaw(next);
  }

  function releaseHeld() {
    if (!heldControl) return;
    var stopType = heldControl.stop;
    heldControl = null;
    syncHeldClass();
    if (stopType) sendCommand({ type: stopType }, true);
  }

  function startHold(button) {
    if (button.disabled || heldControl) return;
    var startType = button.getAttribute("data-hold-start");
    var stopType = button.getAttribute("data-hold-stop");
    heldControl = { start: startType, stop: stopType };
    button.classList.add("is-held");
    sendCommand({ type: startType });
  }

  function syncHeldClass() {
    document.querySelectorAll("[data-hold-start]").forEach(function (node) { node.classList.toggle("is-held", Boolean(heldControl && node.getAttribute("data-hold-start") === heldControl.start)); });
  }

  function friendlyError(code) {
    return ({ STALE_PHASE: "現場剛剛往下走，已更新畫面。", STALE_VERSION: "另一支手機剛做了動作，請依新狀況再操作。", FUTURE_PHASE: "這個控制還沒到時間。", FUTURE_VERSION: "這支手機尚未收到目前狀況。", WRONG_ROLE: "這不是你這支手機的控制。", IMPOSSIBLE_CONTROL: "目前物理條件不允許這個控制。", DUPLICATE_ACTION: "控制已經是這個狀態。", TOKEN_MISMATCH: "角色連結失效，請重新加入。" })[code] || "這個控制沒有成功；畫面正在更新。";
  }

  function connectSocket(afterTakeover) {
    if (!roomCode || !currentRole) return;
    if (socket) try { socket.close(1000, "replace"); } catch {}
    pendingTakeover = Boolean(afterTakeover);
    var token = roleToken(currentRole);
    socket = new WebSocket(wsUrl(roomCode, currentRole, token));
    socket.addEventListener("message", function (event) {
      var payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (payload.type === "WELCOME") {
        if (payload.token) setStored("token:" + payload.roleId, payload.token);
        reconnectAttempts = 0;
        handleState(payload.state);
        if (pendingTakeover && !payload.state.currentSeat?.started) { pendingTakeover = false; sendCommand({ type: "TAKEOVER" }); }
        else pendingTakeover = false;
      } else if (payload.type === "STATE") handleState(payload.state);
      else if (payload.type === "ACK") {
        commandInFlight = false;
        pendingCommand = null;
        flushQueued();
      }
      else if (payload.type === "ERROR") {
        var failedCommand = pendingCommand;
        commandInFlight = false;
        pendingCommand = null;
        if ((payload.code === "STALE_PHASE" || payload.code === "STALE_VERSION") && failedCommand && !queuedCommand) queuedCommand = failedCommand;
        setStatus(friendlyError(payload.code), "error");
        render();
      }
    });
    socket.addEventListener("close", function () {
      commandInFlight = false;
      pendingCommand = null;
      releaseHeld();
      if (!roomCode || !currentRole || !roleToken(currentRole) || state?.phase === "OUTCOME") return;
      clearTimeout(reconnectTimer);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(function () { connectSocket(false); }, Math.min(4000, 350 + reconnectAttempts * 450));
      setStatus("正在接回目前控制席……", "warn"); render();
    });
  }

  function enterRoom(code) {
    roomCode = normalizeRoomCode(code);
    state = null; currentRole = null; selectedRole = null; statusText = "";
    history.replaceState(null, "", shareUrl(roomCode));
    fetch(workerBaseUrl + "/rooms/" + roomCode, { headers: { Accept: "application/json" } }).then(function (response) { return response.json().then(function (payload) { return { response: response, payload: payload }; }); }).then(function (result) {
      if (!result.response.ok) throw new Error(result.payload.error || "ROOM_FAILED");
      state = result.payload;
      var lastRole = getStored("last-role");
      if (ROLE_IDS.indexOf(lastRole) >= 0 && roleToken(lastRole)) { currentRole = lastRole; selectedRole = lastRole; connectSocket(false); }
      render();
    }).catch(function () { roomCode = null; setStatus("找不到這個事件，請確認六碼代碼。", "error"); render(); });
  }

  function createRoom() {
    setStatus("正在建立事件……", ""); render();
    fetch(workerBaseUrl + "/rooms", { method: "POST", headers: { "Content-Type": "application/json" } }).then(function (response) { return response.json().then(function (payload) { return { response: response, payload: payload }; }); }).then(function (result) {
      if (!result.response.ok) throw new Error(result.payload.error || "CREATE_FAILED");
      enterRoom(result.payload.roomCode);
    }).catch(function () { setStatus("目前無法建立事件，請稍後再試。", "error"); render(); });
  }

  function unlockAudio() {
    audioUnlocked = true;
    try {
      operatorAudio.muted = true;
      var result = operatorAudio.play();
      if (result?.then) result.then(function () { operatorAudio.pause(); operatorAudio.currentTime = 0; operatorAudio.muted = false; }).catch(function () { operatorAudio.muted = false; });
    } catch { operatorAudio.muted = false; }
  }

  function audioKey(id) { return (roomCode || "none") + ":" + id; }
  function completeOperator(id) {
    var key = audioKey(id);
    if (audioCompleted[key] || state?.audioMasterRole !== currentRole) return;
    audioCompleted[key] = true;
    sendCommand({ type: "COMPLETE_OPERATOR", eventId: id });
  }

  function playOperator(replay) {
    var event = state?.operatorEvent;
    if (!event) return;
    var row = DIALOGUE[event.id];
    if (!row?.audio || missingAudio) { if (!replay) completeOperator(event.id); return; }
    operatorAudio.src = new URL(row.audio, location.href).toString();
    operatorAudio.muted = false;
    if (replay) operatorAudio.currentTime = 0;
    operatorAudio.onended = replay ? null : function () { completeOperator(event.id); };
    operatorAudio.onerror = replay ? null : function () { completeOperator(event.id); };
    try { var result = operatorAudio.play(); if (result?.catch) result.catch(function () { if (!replay) completeOperator(event.id); }); } catch { if (!replay) completeOperator(event.id); }
  }

  function syncAudio() {
    clearTimeout(audioFallbackTimer);
    var event = state?.operatorEvent;
    if (!event || event.acknowledged || state.audioMasterRole !== currentRole) return;
    var key = audioKey(event.id);
    if (boundAudioEvent !== key) { boundAudioEvent = key; operatorAudio.onended = null; operatorAudio.onerror = null; }
    audioFallbackTimer = setTimeout(function () { completeOperator(event.id); }, audioFallbackMs);
    if (!audioAttempted[key]) { audioAttempted[key] = true; if (audioUnlocked) playOperator(false); }
  }

  function updateTimer() {
    var node = document.querySelector("[data-timer]");
    if (!node || !state?.deadlineAt) return;
    var serverEstimate = Date.now() - clockOffset;
    node.textContent = Math.max(0, Math.ceil((state.deadlineAt - serverEstimate) / 1000)) + " 秒";
  }
  setInterval(updateTimer, 250);

  document.addEventListener("click", function (event) {
    var target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-create]")) return createRoom();
    if (target.matches("[data-role-select]")) { selectedRole = target.getAttribute("data-role-select"); render(); return; }
    if (target.matches("[data-takeover]")) { currentRole = selectedRole; setStored("last-role", currentRole); unlockAudio(); connectSocket(true); setStatus("正在接手控制席……", ""); render(); return; }
    if (target.matches("[data-share]")) { navigator.clipboard?.writeText(shareUrl(roomCode)); setStatus("加入連結已複製。", ""); render(); return; }
    if (target.matches("[data-power]")) return sendCommand({ type: "SET_POWER", mode: target.getAttribute("data-power") });
    if (target.matches("[data-command]")) return sendCommand({ type: target.getAttribute("data-command") });
    if (target.matches("[data-replay]")) return playOperator(true);
    if (target.matches("[data-new-event]")) { if (socket) try { socket.close(1000, "new event"); } catch {} roomCode = null; state = null; currentRole = null; selectedRole = null; history.replaceState(null, "", location.pathname); render(); }
  });

  document.addEventListener("submit", function (event) { if (!event.target.matches("[data-join-form]")) return; event.preventDefault(); var code = normalizeRoomCode(event.target.elements.room.value); if (code.length !== 6) { setStatus("請輸入六碼事件代碼。", "error"); render(); } else enterRoom(code); });
  document.addEventListener("input", function (event) { if (event.target.name === "room") event.target.value = normalizeRoomCode(event.target.value); });
  document.addEventListener("pointerdown", function (event) {
    var hold = event.target.closest("[data-hold-start]");
    var training = event.target.closest("[data-training-hold]");
    if (hold) { event.preventDefault(); try { hold.setPointerCapture?.(event.pointerId); } catch {} startHold(hold); }
    if (training && !training.disabled) { event.preventDefault(); trainingHeldAt = Date.now(); training.classList.add("is-held"); try { training.setPointerCapture?.(event.pointerId); } catch {} }
  });
  function pointerRelease(event) {
    if (heldControl) { event?.preventDefault?.(); releaseHeld(); }
    if (trainingHeldAt) { var elapsed = Date.now() - trainingHeldAt; trainingHeldAt = 0; document.querySelector("[data-training-hold]")?.classList.remove("is-held"); if (elapsed >= 250) sendCommand({ type: "TRAIN" }); }
  }
  document.addEventListener("pointerup", pointerRelease);
  document.addEventListener("pointercancel", pointerRelease);
  global.addEventListener("blur", releaseHeld);
  document.addEventListener("visibilitychange", function () { if (document.hidden) releaseHeld(); });

  var initialRoom = normalizeRoomCode(query.get("room"));
  if (initialRoom.length === 6) enterRoom(initialRoom); else render();

  global.__MOMEY_A9__ = {
    getState: function () { return state; },
    getRoomCode: function () { return roomCode; },
    getCurrentRole: function () { return currentRole; },
    getAudioElementForTest: function () { return operatorAudio; },
    getHeldControlForTest: function () { return heldControl; },
    releaseHeldForTest: releaseHeld,
    workerBaseUrl: workerBaseUrl,
    render: render
  };
})(window);
