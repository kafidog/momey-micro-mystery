const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = process.env.MOMEY_A6_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("Set MOMEY_A6_PLAYWRIGHT_MODULE to playwright/index.js");
const { chromium } = require(modulePath);
const baseURL = process.env.MOMEY_A6_BASE_URL || "http://127.0.0.1:4176/playable-a6";
const chromePath = process.env.MOMEY_A6_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const screenshotRoot = path.resolve(process.env.MOMEY_A6_SCREENSHOT_ROOT || path.join(process.cwd(), "screenshots"));
fs.mkdirSync(screenshotRoot, { recursive: true });
for (const file of fs.readdirSync(screenshotRoot)) if (file.endsWith(".png")) fs.rmSync(path.join(screenshotRoot, file));

const issues = [];
let browser;
function observe(page, label) {
  page.setDefaultTimeout(10000);
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) issues.push(label + " " + message.type() + ": " + message.text()); });
  page.on("pageerror", (error) => issues.push(label + " pageerror: " + error.message));
}
function profile(seed) {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i += 1) { hash ^= clean.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
}
function seedFor(target) {
  for (let i = 0; i < 1000; i += 1) { const seed = "CASE" + i; if (profile(seed) === target) return seed; }
  throw new Error("seed not found");
}
async function healthy(page) {
  const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth, blank: document.body.innerText.trim().length < 80, overlay: /Vite|Webpack|Next\.js|Application error|Internal Server Error/i.test(document.body.innerText) }));
  assert.deepEqual(state, { overflow: false, blank: false, overlay: false });
}
async function touch(page, selector) {
  const boxes = await page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== "hidden"; }).map((node) => { const r = node.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
  assert.ok(boxes.length > 0, selector);
  for (const box of boxes) assert.ok(box.w >= 44 && box.h >= 44, selector + " " + box.w + "x" + box.h);
}
async function shot(page, file, selector) {
  if (selector) {
    const topbar = page.locator(".topbar");
    const hasTopbar = await topbar.count();
    if (hasTopbar) await topbar.evaluate((node) => { node.dataset.qaVisibility = node.style.visibility; node.style.visibility = "hidden"; });
    try { await page.locator(selector).screenshot({ path: path.join(screenshotRoot, file) }); }
    finally { if (hasTopbar) await topbar.evaluate((node) => { node.style.visibility = node.dataset.qaVisibility || ""; delete node.dataset.qaVisibility; }); }
  }
  else await page.screenshot({ path: path.join(screenshotRoot, file), fullPage: false });
}
async function openRole(context, role, seed, label) {
  const page = await context.newPage(); observe(page, label);
  await page.goto(baseURL + "/role-" + role + ".html?seed=" + seed);
  await healthy(page);
  return page;
}
async function diagnostic(page, key) {
  await page.locator("[data-planning-confirm]").click();
  const choices = await page.locator("[data-diagnostic-option]").all();
  const alternate = await choices[0].getAttribute("data-diagnostic-option") === key ? choices[1] : choices[0];
  await alternate.click();
  await page.locator("[data-diagnostic-option=\"" + key + "\"]").click();
  assert.equal(await page.locator("[data-diagnostic-option=\"" + key + "\"]").getAttribute("aria-pressed"), "true");
  await page.locator("[data-diagnostic-confirm]").click();
  assert.equal(await page.locator(".result-stage").isVisible(), true);
  assert.equal(await page.locator("[data-diagnostic-option]:not([disabled])").count(), 0);
  await page.reload();
  assert.equal(await page.locator(".result-stage").isVisible(), true);
}
async function finish(page, choice) {
  await page.locator("[data-sharing-confirm]").click();
  const other = choice === "close" ? "hold" : "close";
  await page.locator("[data-final-choice=\"" + other + "\"]").click();
  await page.locator("[data-final-choice=\"" + choice + "\"]").click();
  assert.equal(await page.locator("[data-final-confirm]").isEnabled(), false);
  await page.locator("[data-agreement-spoken]").click();
  assert.equal(await page.locator("[data-final-confirm]").isEnabled(), true);
  await page.locator("[data-final-confirm]").click();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true);
  await page.reload();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true);
}
async function branch(seed, role, diagnosticKey, choice, screenshot) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await openRole(context, role, seed, "branch-" + seed + "-" + diagnosticKey + "-" + choice);
  try { await diagnostic(page, diagnosticKey); await finish(page, choice); if (screenshot) await shot(page, screenshot, ".consequence-stage"); return await page.locator(".consequence-stage").innerText(); }
  finally { await context.close(); }
}

(async () => {
  browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const breakSeed = seedFor("breakline");
  const backSeed = seedFor("backwash");

  const entryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const entry = await entryContext.newPage(); observe(entry, "entry");
  await entry.goto(baseURL + "/?seed=" + breakSeed);
  assert.match(await entry.title(), /MOMEY A6/);
  assert.equal(await entry.locator(".story-panel").count(), 6);
  assert.equal(await entry.locator(".role-link-card").count(), 3);
  await healthy(entry); await shot(entry, "01-entry-comic.png", ".story-section");
  await shot(entry, "02-operator-first-appearance.png", ".operator-card");
  await entryContext.close();

  const trio = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const operations = await openRole(trio, 1, breakSeed, "operations");
  const rescue = await openRole(trio, 2, breakSeed, "rescue");
  const safety = await openRole(trio, 3, breakSeed, "safety");
  try {
    assert.equal(await operations.locator("[data-top-seed]").innerText(), await rescue.locator("[data-top-seed]").innerText());
    assert.equal(await rescue.locator("[data-top-seed]").innerText(), await safety.locator("[data-top-seed]").innerText());
    await operations.locator("[data-audio-toggle]").click();
    assert.equal(await operations.locator("[data-audio-toggle]").getAttribute("aria-pressed"), "true");
    await shot(operations, "03-shared-audio-toggle.png", ".operator-console");
    await shot(operations, "04-role-operations.png", ".role-brief");
    await shot(rescue, "05-role-rescue.png", ".role-brief");
    await shot(safety, "06-role-safety.png", ".role-brief");
    await shot(operations, "07-team-planning.png", ".planning-stage");
    await Promise.all([operations.locator("[data-planning-confirm]").click(), rescue.locator("[data-planning-confirm]").click(), safety.locator("[data-planning-confirm]").click()]);
    await operations.locator("[data-diagnostic-option=\"O1\"]").click();
    await rescue.locator("[data-diagnostic-option=\"R1\"]").click();
    await safety.locator("[data-diagnostic-option=\"S2\"]").click();
    await shot(operations, "08-operations-diagnostic-choice.png", ".diagnostic-stage");
    await shot(rescue, "09-rescue-diagnostic-choice.png", ".diagnostic-stage");
    await shot(safety, "10-safety-diagnostic-choice.png", ".diagnostic-stage");
    await operations.locator("[data-diagnostic-confirm]").click();
    await rescue.locator("[data-diagnostic-confirm]").click();
    await safety.locator("[data-diagnostic-confirm]").click();
    await shot(rescue, "11-operator-preset-response.png", ".result-stage");
    await shot(operations, "20-caption-controls.png", ".operator-console");
    await healthy(operations); await healthy(rescue); await healthy(safety);
    await touch(operations, "button");
  } finally { await trio.close(); }

  const p2Context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const p2 = await openRole(p2Context, 3, backSeed, "profile-two");
  await diagnostic(p2, "S1");
  await shot(p2, "12-different-profile-example.png", ".result-stage");
  await p2.locator("[data-sharing-confirm]").click();
  await p2.locator("[data-final-choice=\"hold\"]").click();
  await shot(p2, "13-final-decision.png", ".decision-stage");
  await p2Context.close();

  const outcomes = {};
  outcomes.breakClose = await branch(breakSeed, 1, "O2", "close", "14-profile1-close-consequence.png");
  outcomes.breakHold = await branch(breakSeed, 2, "R2", "hold", "15-profile1-hold-consequence.png");
  outcomes.backClose = await branch(backSeed, 2, "R1", "close", "16-profile2-close-consequence.png");
  outcomes.backHold = await branch(backSeed, 3, "S2", "hold", "17-profile2-hold-consequence.png");
  assert.match(outcomes.breakClose, /失去生命/);
  assert.match(outcomes.breakHold, /高承.*死亡/s);
  assert.match(outcomes.backClose, /永久缺氧傷害/);
  assert.match(outcomes.backHold, /永久呼吸傷害/);

  const mobile390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const m390 = await openRole(mobile390, 2, breakSeed, "mobile390");
  await m390.locator("[data-planning-confirm]").click(); await shot(m390, "18-mobile-390x844.png"); await healthy(m390); await mobile390.close();
  const mobile412 = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const m412 = await openRole(mobile412, 3, backSeed, "mobile412");
  await m412.locator("[data-planning-confirm]").click(); await shot(m412, "19-mobile-412x915.png"); await healthy(m412); await mobile412.close();

  const noAudio = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await noAudio.addInitScript(() => { try { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); Object.defineProperty(window, "SpeechSynthesisUtterance", { value: undefined, configurable: true }); } catch (_) {} });
  const silent = await openRole(noAudio, 1, backSeed, "no-audio");
  await silent.locator("[data-planning-confirm]").click();
  assert.equal(await silent.locator(".diagnostic-stage").isVisible(), true);
  assert.match(await silent.locator(".live-caption").innerText(), /六個未知只能查三個/);
  await noAudio.close();

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const resetPage = await openRole(resetContext, 1, breakSeed, "reset");
  await resetPage.evaluate(() => {
    localStorage.setItem("momey-a5:protected-check", "keep-a5");
    localStorage.setItem("momey-a6:" + new URLSearchParams(location.search).get("seed") + ":role:2", "remove-current-seed");
  });
  await resetPage.locator("[data-reset]").first().click();
  await resetPage.waitForURL(/playable-a6\/index\.html\?seed=/);
  const resetState = await resetPage.evaluate((oldSeed) => ({
    a5: localStorage.getItem("momey-a5:protected-check"),
    oldSeedKeys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a6:" + oldSeed + ":"))
  }), breakSeed);
  assert.equal(resetState.a5, "keep-a5");
  assert.deepEqual(resetState.oldSeedKeys, []);
  assert.notEqual(new URL(resetPage.url()).searchParams.get("seed"), breakSeed);
  await resetContext.close();

  assert.deepEqual(issues, [], issues.join(" | "));
  const screenshots = fs.readdirSync(screenshotRoot).filter((file) => file.endsWith(".png")).sort();
  assert.equal(screenshots.length, 20);
  console.log(JSON.stringify({ status: "PASS", baseURL, seeds: { breakline: breakSeed, backwash: backSeed }, runs: ["profile1 O2 close", "profile1 R2 hold", "profile2 R1 close", "profile2 S2 hold", "profile2 S1 uncommitted replay path"], viewports: ["1280x900", "390x844", "412x915"], audioFallback: "PASS", refresh: "diagnostic and consequence PASS", reset: "current A6 seed only; A5 retained", screenshots, consoleIssues: issues }, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close().catch(() => {}); });
