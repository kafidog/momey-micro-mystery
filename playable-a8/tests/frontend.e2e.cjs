"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PLAYABLE_ROOT = path.resolve(__dirname, "..");
const WORKER_ROOT = path.resolve(__dirname, "..", "..", "worker-a8");
const STATIC_PORT = 1574;
const WORKER_PORT = 8787;
const STATIC_ORIGIN = "http://127.0.0.1:" + STATIC_PORT;
const WORKER_URL = "http://127.0.0.1:" + WORKER_PORT;
const NPX_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const BROWSER_EXECUTABLE = process.env.MOMEY_A8_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WRANGLER_ARGS = [
  NPX_CLI,
  "--yes",
  "wrangler@4.120.0",
  "dev",
  "--local",
  "--compatibility-date",
  "2026-08-08",
  "--ip",
  "127.0.0.1",
  "--port",
  String(WORKER_PORT)
];

let staticServer = null;
let wranglerProcess = null;
const serviceLogs = [];

function recordServiceLog(stream, chunk) {
  const line = String(chunk).trim();
  if (line) serviceLogs.push(stream + ": " + line);
}

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg"
  }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function startStaticServer() {
  staticServer = http.createServer((request, response) => {
    try {
      const requested = decodeURIComponent((request.url || "/").split("?")[0]);
      const relative = requested === "/" ? "/index.html" : requested;
      const filePath = path.resolve(PLAYABLE_ROOT, "." + relative);
      if (!filePath.startsWith(PLAYABLE_ROOT + path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(400);
      response.end(String(error.message || error));
    }
  });
  await new Promise((resolve, reject) => {
    staticServer.once("error", reject);
    staticServer.listen(STATIC_PORT, "127.0.0.1", resolve);
  });
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (wranglerProcess && wranglerProcess.exitCode !== null) {
      throw new Error("Wrangler exited before browser health check:\n" + serviceLogs.slice(-30).join("\n"));
    }
    try {
      const response = await fetch(WORKER_URL + "/health");
      if (response.ok) {
        const payload = await response.json();
        assert.equal(payload.status, "ok");
        return;
      }
    } catch {
      // Local Wrangler is still booting.
    }
    await delay(250);
  }
  throw new Error("Wrangler health check timed out:\n" + serviceLogs.slice(-30).join("\n"));
}

async function startWrangler() {
  wranglerProcess = spawn(process.execPath, WRANGLER_ARGS, {
    cwd: WORKER_ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  wranglerProcess.stdout.on("data", (chunk) => recordServiceLog("stdout", chunk));
  wranglerProcess.stderr.on("data", (chunk) => recordServiceLog("stderr", chunk));
  await waitForHealth();
}

function pageUrl(roomCode, options = {}) {
  const query = new URLSearchParams({
    worker: WORKER_URL,
    audioFallbackMs: String(options.audioFallbackMs || 500)
  });
  if (roomCode) query.set("room", roomCode);
  if (options.missingAudio) query.set("missingAudio", "1");
  return STATIC_ORIGIN + "/index.html?" + query.toString();
}

async function waitFor(page, predicate, arg, label, timeout = 12000) {
  return page.waitForFunction(predicate, arg, { timeout, polling: 25 }).catch((error) => {
    throw new Error(label + "\n" + error.message);
  });
}

async function state(page) {
  return page.evaluate(() => window.__MOMEY_A8__ && window.__MOMEY_A8__.getState());
}

async function waitPhase(page, phase, label = phase, timeout = 12000) {
  await waitFor(page, (expected) => window.__MOMEY_A8__ && window.__MOMEY_A8__.getState()?.phase === expected, phase, label, timeout);
}

async function waitOperatorAcknowledged(page, label = "operator acknowledgement") {
  await waitFor(page, () => {
    const current = window.__MOMEY_A8__ && window.__MOMEY_A8__.getState();
    return Boolean(current?.operatorEvent?.acknowledged);
  }, undefined, label);
}

async function assertMobilePage(page, label) {
  const result = await page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
    };
    const controls = [...document.querySelectorAll("button, input, summary")].filter(visible).map((node) => {
      const rect = node.getBoundingClientRect();
      return { text: (node.innerText || node.getAttribute("aria-label") || "").trim(), width: rect.width, height: rect.height };
    });
    return {
      bodyFontSize: Number.parseFloat(getComputedStyle(document.body).fontSize),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls
    };
  });
  assert.ok(result.bodyFontSize >= 16, label + " body font must be at least 16px");
  assert.ok(result.scrollWidth <= result.clientWidth + 1, label + " must not overflow horizontally");
  for (const control of result.controls) {
    assert.ok(control.width >= 48 && control.height >= 48, label + " control below 48px: " + control.text);
  }
}

async function assertVisibleCopy(page, label) {
  const text = await page.locator("body").innerText();
  assert.doesNotMatch(text, /WebSocket|Durable Object|profile key|engine state|R[123]_|BREAKLINE|BACKWASH|backupPower|gateStability|gaoProtection|rescueProgress|trolleyDispatched|改選一件事|繼續這段播報/, label + " exposes technical or forbidden player copy");
  const buttons = await page.locator("button").allTextContents();
  assert.ok(buttons.every((button) => !/WebSocket|Durable Object|profile key|engine state|R[123]_|改選一件事|繼續這段播報/.test(button)), label + " button wording is player-facing");
}

async function assertCurrentView(page, expected, label) {
  const view = await page.locator("[data-view]").getAttribute("data-view");
  assert.equal(view, expected, label + " must render only the current phase view");
  await assertMobilePage(page, label);
  await assertVisibleCopy(page, label);
}

async function audioElementIdentity(page, label) {
  const present = await page.evaluate(() => Boolean(window.__MOMEY_A8__?.getAudioElementForTest()));
  assert.equal(present, true, label + " must have the persistent operator audio element");
}

async function dispatchAudioEnded(page, label) {
  const dispatched = await page.evaluate(() => {
    const audio = window.__MOMEY_A8__?.getAudioElementForTest();
    if (!audio) return false;
    audio.dispatchEvent(new Event("ended"));
    return true;
  });
  assert.equal(dispatched, true, label + " audio ended event must be bindable");
}

async function completeOperator(masterPage, allPages, label) {
  const before = await state(masterPage);
  assert.ok(before?.operatorEvent?.id, label + " needs a current shared event");
  await dispatchAudioEnded(masterPage, label);
  await Promise.all(allPages.map((page) => waitOperatorAcknowledged(page, label + " acknowledged")));
}

async function selectAndConfirm(page, label) {
  const options = page.locator("[data-action-select]");
  assert.ok(await options.count() >= 2, label + " should expose legal action options");
  await options.first().click();
  const confirm = page.locator("[data-confirm-action]:not(:disabled)");
  await confirm.waitFor({ state: "visible", timeout: 3000 });
  await confirm.click();
}

async function readyAll(pages, label) {
  for (const page of pages) {
    await page.locator("[data-ready]").click();
  }
  await Promise.all(pages.map((page) => waitPhase(page, label, "ready -> " + label)));
}

async function chooseVoteAll(pages, vote, label) {
  for (const page of pages) {
    await page.locator(`[data-vote="${vote}"]`).click();
  }
  await Promise.all(pages.map((page) => waitPhase(page, "ENDING", label)));
}

async function createRoom(browserContext, options) {
  const page = await browserContext.newPage();
  await page.goto(pageUrl(null, options), { waitUntil: "domcontentloaded" });
  await page.locator("[data-create]").click();
  await page.locator('[data-view="lobby"]', { timeout: 12000 }).waitFor();
  const roomCode = (await page.locator("[data-room-code]").innerText()).trim();
  assert.match(roomCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  await assertCurrentView(page, "lobby", "browser create reaches lobby");
  return { page, roomCode };
}

async function joinRoom(browserContext, roomCode, options) {
  const page = await browserContext.newPage();
  await page.goto(pageUrl(roomCode, options), { waitUntil: "domcontentloaded" });
  await page.locator('[data-view="lobby"]', { timeout: 12000 }).waitFor();
  await assertCurrentView(page, "lobby", "join lobby");
  return page;
}

async function takeRole(page, roleId, label) {
  const role = page.locator(`[data-role-select="${roleId}"]`);
  if (await role.count() === 0) {
    throw new Error(label + " missing role selector " + roleId + "; found=" + await page.locator("[data-role-select]").count() + " cards=" + await page.locator(".role-card").count() + " html=" + await page.locator(".role-card").first().evaluate((node) => node.outerHTML) + " body=" + await page.locator("body").innerText());
  }
  await role.click();
  await page.locator("[data-takeover]").click();
  await waitFor(page, (role) => window.__MOMEY_A8__?.getCurrentRole() === role, roleId, label + " selected role");
}

async function runRoomPath(browser, viewport, options) {
  const contextOptions = { viewport, serviceWorkers: "block" };
  const contexts = [];
  for (let index = 0; index < 3; index += 1) {
    const context = await browser.newContext(contextOptions);
    await context.addInitScript(() => {
      window.__A8_PLAY_LOG = [];
      HTMLMediaElement.prototype.play = function () {
        if (this.getAttribute("data-audio-persistent") === "true") {
          window.__A8_PLAY_LOG.push({ src: this.getAttribute("src") || this.src, at: Date.now() });
        }
        return Promise.resolve();
      };
    });
    contexts.push(context);
  }
  const pages = [];
  try {
    const created = await createRoom(contexts[0], options);
    pages.push(created.page);
    pages.push(await joinRoom(contexts[1], created.roomCode, options));
    pages.push(await joinRoom(contexts[2], created.roomCode, options));
    const roles = ["operations", "rescue", "safety"];
    for (let index = 0; index < pages.length; index += 1) {
      await takeRole(pages[index], roles[index], "client " + roles[index]);
      await audioElementIdentity(pages[index], "client " + roles[index]);
    }
    await Promise.all(pages.map((page) => waitFor(page, () => {
      const phase = window.__MOMEY_A8__?.getState()?.phase;
      return /^INTRO_[1-8]$/.test(phase || "") || phase === "ROUND1_ACTION";
    }, undefined, "all clients enter intro or progress from fallback")));
    await Promise.all(pages.map((page) => page.evaluate(() => {
      window.__A8_AUDIO_REF = window.__MOMEY_A8__.getAudioElementForTest();
    })));

    if (options.missingAudio) {
      await Promise.all(pages.map((page) => waitPhase(page, "ROUND1_ACTION", "missing audio fallback reaches round 1", 10000)));
    } else {
      for (let beat = 1; beat <= 8; beat += 1) {
        await Promise.all(pages.map((page) => waitPhase(page, "INTRO_" + beat, "intro beat " + beat)));
        const masterBefore = await pages[0].evaluate(() => window.__A8_PLAY_LOG?.length || 0);
        if (beat === 1) {
          await pages[0].evaluate(() => window.__MOMEY_A8__.render());
          await delay(80);
          const masterAfterRerender = await pages[0].evaluate(() => window.__A8_PLAY_LOG?.length || 0);
          assert.equal(masterAfterRerender, masterBefore, "same event must not autoplay twice after render");
          const nonMasterPlays = await pages[1].evaluate(() => (window.__A8_PLAY_LOG || []).filter((entry) => !entry.src.includes("a7_role_start")).length);
          assert.equal(nonMasterPlays, 0, "non-master phone must not autoplay shared event");
        }
        await dispatchAudioEnded(pages[0], "intro beat " + beat);
        if (beat < 8) await Promise.all(pages.map((page) => waitPhase(page, "INTRO_" + (beat + 1), "intro next beat")));
      }
      await Promise.all(pages.map((page) => waitPhase(page, "ROUND1_ACTION", "intro complete")));
    }

    await Promise.all(pages.map((page) => page.evaluate((expected) => {
      if (window.__A8_AUDIO_REF !== window.__MOMEY_A8__.getAudioElementForTest()) throw new Error(expected);
    }, "persistent audio identity changed before round 1")));
    await Promise.all(pages.map((page) => assertCurrentView(page, "action", "round 1 action")));
    for (const page of pages) await selectAndConfirm(page, "round 1");
    await Promise.all(pages.map((page) => waitPhase(page, "ROUND1_DISCUSS", "round 1 discuss")));
    await completeOperator(pages[0], pages, "round 1 report");
    await readyAll(pages, "ROUND2_ACTION");

    // Reloading a role-bearing page exercises browser reconnect with its
    // room-scoped token while the other two clients remain in the room.
    await pages[2].reload({ waitUntil: "domcontentloaded" });
    try {
      await waitFor(pages[2], () => {
        const current = window.__MOMEY_A8__?.getState();
        return current?.phase === "ROUND2_ACTION" && current?.currentSeat?.roleId === "safety";
      }, undefined, "safety reconnect with private projection");
    } catch (error) {
      const diagnostic = await pages[2].evaluate(() => {
        const room = window.__MOMEY_A8__?.getRoomCode();
        const prefix = "momey-a8:" + room + ":";
        return {
          role: window.__MOMEY_A8__?.getCurrentRole(),
          state: window.__MOMEY_A8__?.getState(),
          lastRole: localStorage.getItem(prefix + "last-role"),
          tokenPresent: Boolean(localStorage.getItem(prefix + "token:safety"))
        };
      });
      throw new Error(error.message + " diagnostic=" + JSON.stringify(diagnostic));
    }
    const reconnectedState = await state(pages[2]);
    assert.equal(reconnectedState.currentSeat.roleId, "safety");
    assert.ok(reconnectedState.currentSeat.private.round1, "reconnect must retain the private result");
    await pages[2].evaluate(() => {
      window.__A8_AUDIO_REF = window.__MOMEY_A8__.getAudioElementForTest();
    });
    await assertCurrentView(pages[2], "action", "reconnected round 2 action");

    for (const page of pages) await selectAndConfirm(page, "round 2");
    await Promise.all(pages.map((page) => waitPhase(page, "ROUND2_DISCUSS", "round 2 discuss")));
    await completeOperator(pages[0], pages, "round 2 report");
    await readyAll(pages, "ROUND3_ACTION");
    await Promise.all(pages.map(async (page) => {
      await assertCurrentView(page, "action", "round 3 action before escalation acknowledgement");
      assert.equal(await page.locator("[data-view=action] .voice-panel").count(), 1, "round 3 escalation caption must be visible");
      assert.ok((await page.locator("[data-caption]").innerText()).trim().length > 0, "round 3 escalation caption must contain text");
      if (options.missingAudio) {
        assert.ok(await page.locator("[data-action-select]").count() >= 2, "missing audio fallback must unlock round 3 actions");
      } else {
        assert.equal(await page.locator("[data-action-select]").count(), 0, "round 3 actions must wait for escalation acknowledgement");
        assert.equal(await page.locator("[data-confirm-action]").count(), 0, "round 3 confirmation must wait for escalation acknowledgement");
      }
      await page.evaluate(() => window.__MOMEY_A8__.render());
      assert.equal(await page.evaluate(() => window.__A8_AUDIO_REF === window.__MOMEY_A8__.getAudioElementForTest()), true, "audio identity must survive round 3 render");
    }));
    await completeOperator(pages[0], pages, "round 3 escalation");
    const replayBefore = await pages[0].evaluate(() => window.__A8_PLAY_LOG?.length || 0);
    await pages[0].locator("[data-replay-voice]").click();
    await delay(40);
    const replayAfter = await pages[0].evaluate(() => window.__A8_PLAY_LOG?.length || 0);
    assert.equal(replayAfter, replayBefore + 1, "replay is a secondary explicit playback");
    await Promise.all(pages.map((page) => waitFor(page, () => (window.__MOMEY_A8__?.getState()?.options || []).length >= 2, undefined, "round 3 options unlock")));
    for (const page of pages) await selectAndConfirm(page, "round 3");
    await Promise.all(pages.map((page) => waitPhase(page, "ROUND3_DISCUSS", "round 3 discuss")));
    await completeOperator(pages[0], pages, "round 3 report");
    await readyAll(pages, "FINAL_VOTE");
    await Promise.all(pages.map((page) => assertCurrentView(page, "final-vote", "final vote")));
    await chooseVoteAll(pages, options.vote || "close", "ending");
    await Promise.all(pages.map((page) => assertCurrentView(page, "ending", "ending")));
    const endingText = await pages[0].locator('[data-view="ending"]').innerText();
    assert.doesNotMatch(endingText, /這是這一場的固定結果/);
    assert.match(endingText, /如果要把這次的決定交給下一班人/);
    assert.equal(await pages[0].evaluate(() => window.__A8_AUDIO_REF === window.__MOMEY_A8__.getAudioElementForTest()), true, "audio identity must survive ending render");
    if (options.sameTabSecondRoom) {
      await pages[0].evaluate(() => {
        window.__A8_FIRST_ROOM_AUDIO_REF = window.__MOMEY_A8__.getAudioElementForTest();
      });
      await pages[0].locator("[data-new-event]").click();
      await pages[0].locator('[data-view="entry"]').waitFor();
      await pages[0].locator("[data-create]").click();
      await pages[0].locator('[data-view="lobby"]').waitFor();
      const secondRoomCode = (await pages[0].locator("[data-room-code]").innerText()).trim();
      assert.notEqual(secondRoomCode, created.roomCode, "same tab must create an independent second room");
      await pages[1].goto(pageUrl(secondRoomCode, options), { waitUntil: "domcontentloaded" });
      await pages[2].goto(pageUrl(secondRoomCode, options), { waitUntil: "domcontentloaded" });
      await Promise.all([pages[1], pages[2]].map((page) => page.locator('[data-view="lobby"]').waitFor()));
      await takeRole(pages[0], "operations", "same-tab second room operations");
      await takeRole(pages[1], "rescue", "same-tab second room rescue");
      await takeRole(pages[2], "safety", "same-tab second room safety");
      await Promise.all(pages.map((page) => waitFor(page, () => /^INTRO_[1-8]$/.test(window.__MOMEY_A8__?.getState()?.phase || ""), undefined, "same-tab second room intro")));
      assert.equal(await pages[0].evaluate(() => window.__A8_FIRST_ROOM_AUDIO_REF === window.__MOMEY_A8__.getAudioElementForTest()), true, "same tab must reuse the persistent audio element");
      const attempted = await pages[0].evaluate(() => window.__MOMEY_A8__.getAudioAttemptedForTest());
      assert.ok(attempted.includes(secondRoomCode + ":A8_INTRO_01"), "second room must attempt the reused event id again");
      assert.ok(await pages[0].evaluate(() => Boolean(window.__MOMEY_A8__.getAudioElementForTest())), "second room must retain audio element");
      await dispatchAudioEnded(pages[0], "same-tab second room intro");
      await waitPhase(pages[0], "INTRO_2", "same-tab second room complete operator");
      const completed = await pages[0].evaluate(() => window.__MOMEY_A8__.getAudioCompleteSentForTest());
      assert.ok(completed.includes(secondRoomCode + ":A8_INTRO_01"), "second room must send completion for reused event id");
    }
    return { roomCode: created.roomCode, pages, contexts };
  } catch (error) {
    for (const page of pages) {
      try { console.error("[A8 browser page]", await page.url(), await page.locator("body").innerText()); } catch {}
    }
    throw error;
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}

async function run() {
  await startStaticServer();
  await startWrangler();
  const browser = await chromium.launch({ headless: true, executablePath: BROWSER_EXECUTABLE });
  try {
    // Main path at the narrowest contracted viewport; alternate path also
    // exercises the missing-audio fallback at the second contracted width.
    await runRoomPath(browser, { width: 390, height: 844 }, { audioFallbackMs: 500, vote: "close", sameTabSecondRoom: true });
    await runRoomPath(browser, { width: 412, height: 915 }, { audioFallbackMs: 35, missingAudio: true, vote: "hold" });
    const appSource = fs.readFileSync(path.join(PLAYABLE_ROOT, "assets", "app.js"), "utf8");
    assert.doesNotMatch(appSource, /data-complete-operator|繼續這段播報|這是這一場的固定結果/);
    assert.match(appSource, /momey-playable-a8-room\.momey-micro-mystery\.workers\.dev/);
    console.log("frontend A8 browser PASS: cors-create=lobby r3-escalation=PASS main=ENDING alternate=ENDING missing-audio=fallback reconnect=PASS mobile=390x844+412x915 audio-persistent=PASS");
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    await run();
  } finally {
    if (staticServer) await new Promise((resolve) => staticServer.close(() => resolve()));
    if (wranglerProcess && wranglerProcess.exitCode === null) {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(wranglerProcess.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        wranglerProcess.kill("SIGTERM");
      }
    }
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
