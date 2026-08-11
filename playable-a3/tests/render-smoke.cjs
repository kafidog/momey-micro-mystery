const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.MOMEY_A3_PLAYWRIGHT_MODULE);

const baseURL = process.env.MOMEY_A3_BASE_URL || "http://127.0.0.1:4173/playable-a3";
const screenshotRoot = process.env.MOMEY_A3_SCREENSHOT_ROOT
  ? path.resolve(process.env.MOMEY_A3_SCREENSHOT_ROOT)
  : path.resolve(process.cwd(), "screenshots");
fs.mkdirSync(screenshotRoot, { recursive: true });
const consoleIssues = [];
let browserHandle = null;

function contains(value, expected, message) {
  assert.ok(value.includes(expected), `${message}: expected ${JSON.stringify(expected)} in ${JSON.stringify(value)}`);
}

async function capture(page, filename) {
  await page.screenshot({ path: path.join(screenshotRoot, filename), fullPage: true });
}

async function assertHealthy(page) {
  const checks = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    frameworkOverlay: /Vite|Webpack|Next\.js|Application error/i.test(document.body.innerText)
  }));
  assert.equal(checks.horizontalOverflow, false, "page must not have horizontal overflow");
  assert.equal(checks.frameworkOverlay, false, "page must not show a framework error overlay");
}

async function clearA3(page) {
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("momey-a3:")).forEach((key) => localStorage.removeItem(key)));
}

async function completeCommand(page) {
  await page.goto(`${baseURL}/role-1.html`);
  await page.locator('[data-command-process="closure"]').click();
  await page.locator('[data-command-endpoint="20"]').click();
  await page.locator('[data-command-process="rescue"]').click();
  await page.locator('[data-command-endpoint="95"]').click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
  await page.locator("[data-team-ready]").click();
  assert.equal(await page.locator(".compact-board").isVisible(), true);
}

async function runBranch(browser, verification, finalChoice) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await completeCommand(page);
  await page.locator(`[data-verify-option="${verification}"]`).click();
  await page.locator("[data-verify-confirm]").click();
  await page.locator(`[data-final-choice="${finalChoice}"]`).click();
  await page.locator("[data-final-confirm]").click();
  const consequence = await page.locator(".consequence-stage").innerText();
  await context.close();
  return consequence;
}

async function main() {
  browserHandle = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
  const browser = browserHandle;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleIssues.push(`${message.type()}: ${message.text()}`); });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  await page.goto(`${baseURL}/`);
  assert.match(await page.title(), /MOMEY A3/);
  assert.equal(await page.locator(".story-panel").count(), 6);
  contains(await page.locator("h1").innerText(), "海岬防洪站", "entry heading");
  await capture(page, "01-entry.png");
  await assertHealthy(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await clearA3(page);
  await page.goto(`${baseURL}/role-1.html`);
  contains(await page.locator("[data-role-tool] h2").innerText(), "0–95 秒", "command tool heading");
  assert.equal(await page.locator("[data-role-result]").isVisible(), false);
  await capture(page, "02-role-command.png");
  await capture(page, "03-command-before.png");
  await page.locator('[data-command-process="closure"]').click();
  await page.locator('[data-command-endpoint="95"]').click();
  contains(await page.locator("[data-command-instruction]").innerText(), "不是", "gentle correction");
  await capture(page, "04-command-corrected.png");
  await page.reload();
  contains(await page.locator("[data-command-instruction]").innerText(), "不是", "command draft refresh");
  assert.equal(await page.locator('[data-command-process="closure"]').getAttribute("aria-pressed"), "true");
  await page.locator('[data-command-endpoint="20"]').click();
  await page.locator('[data-command-process="rescue"]').click();
  await page.locator('[data-command-endpoint="95"]').click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
  contains(await page.locator("[data-role-result]").innerText(), "遠端封閉需要 20 秒", "command result");
  await capture(page, "05-command-complete.png");
  await page.reload();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
  contains(await page.locator("summary").innerText(), "重新查看我的證據", "own evidence reopen");
  await page.locator("[data-team-ready]").click();
  assert.equal(await page.locator(".compact-board > div").count(), 3);
  contains(await page.locator(".compact-board").innerText(), "20 秒封閉會切斷 95 秒救援", "compact board");
  assert.equal(await page.locator(".shared-evidence-grid").count(), 0);
  await capture(page, "12-compact-board.png");
  await assertHealthy(page);

  const rescueContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const rescue = await rescueContext.newPage();
  rescue.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleIssues.push(`rescue ${message.type()}: ${message.text()}`); });
  rescue.on("pageerror", (error) => consoleIssues.push(`rescue pageerror: ${error.message}`));
  await rescue.goto(`${baseURL}/role-2.html`);
  assert.equal(await rescue.locator("[data-role-result]").isVisible(), false);
  await capture(rescue, "06-role-rescue.png");
  await capture(rescue, "07-rescue-before.png");
  for (const key of ["signature", "response"]) await rescue.locator(`[data-inspect-field="${key}"]`).click();
  await rescue.reload();
  contains(await rescue.locator("[data-rescue-instruction]").innerText(), "已看 2/4", "rescue draft refresh");
  for (const key of ["freshness", "route"]) await rescue.locator(`[data-inspect-field="${key}"]`).click();
  assert.equal(await rescue.locator("[data-role-result]").isVisible(), true);
  contains(await rescue.locator("[data-role-result]").innerText(), "可信連結", "rescue result");
  await capture(rescue, "08-rescue-complete.png");
  await rescue.reload();
  assert.equal(await rescue.locator("[data-role-result]").isVisible(), true);
  await assertHealthy(rescue);
  await rescueContext.close();

  const safetyContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const safety = await safetyContext.newPage();
  safety.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleIssues.push(`safety ${message.type()}: ${message.text()}`); });
  safety.on("pageerror", (error) => consoleIssues.push(`safety pageerror: ${error.message}`));
  await safety.goto(`${baseURL}/role-3.html`);
  assert.equal(await safety.locator("[data-role-result]").isVisible(), false);
  await capture(safety, "09-role-safety.png");
  await safety.locator('[data-pressure-marker="40"]').click();
  contains(await safety.locator("[data-safety-instruction]").innerText(), "中間投影", "safety intermediate state");
  await capture(safety, "10-safety-mid.png");
  await safety.reload();
  assert.equal(await safety.locator("[data-pressure-range]").getAttribute("value"), "40", "safety draft must survive refresh");
  contains(await safety.locator("[data-safety-instruction]").innerText(), "中間投影", "safety draft refresh");
  await safety.locator('[data-pressure-marker="95"]').click();
  assert.equal(await safety.locator("[data-role-result]").isVisible(), true);
  contains(await safety.locator("[data-role-result]").innerText(), "承載上限", "safety result");
  await capture(safety, "11-safety-complete.png");
  await safety.reload();
  assert.equal(await safety.locator("[data-role-result]").isVisible(), true);
  await assertHealthy(safety);
  await safetyContext.close();

  await page.locator('[data-verify-option="A"]').click();
  assert.equal(await page.locator("[data-verification-result]").count(), 0);
  await page.locator('[data-verify-option="B"]').click();
  assert.equal(await page.locator('[data-verify-option="B"]').getAttribute("aria-pressed"), "true", "verification draft must change to B");
  await page.locator('[data-verify-option="A"]').click();
  await page.locator("[data-verify-confirm]").click();
  assert.equal(await page.locator("[data-verification-result]").isVisible(), true);
  await page.reload();
  assert.equal(await page.locator("[data-verification-result]").isVisible(), true, "confirmed verification must survive refresh");
  assert.equal(await page.locator('[data-verify-option="B"]').isEnabled(), false, "verification must lock after confirmation");
  await capture(page, "13-verification.png");
  await page.locator('[data-final-choice="close"]').click();
  await page.locator('[data-final-choice="hold"]').click();
  await capture(page, "14-final-summary.png");
  await page.locator("[data-final-confirm]").click();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true);
  await page.reload();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true, "consequence must survive refresh");
  await capture(page, "15-consequence.png");
  await assertHealthy(page);

  const branchResults = await Promise.all([
    runBranch(browser, "A", "close"),
    runBranch(browser, "A", "hold"),
    runBranch(browser, "B", "close"),
    runBranch(browser, "B", "hold")
  ]);
  for (const result of branchResults) contains(result, "後來確認", "branch consequence");
  contains(branchResults[0], "西側推車路線被切斷", "A close branch");
  contains(branchResults[1], "救援推車沿可通軌道清出西側路線", "A hold branch");
  contains(branchResults[2], "西側推車路線被切斷", "B close branch");
  contains(branchResults[3], "壓力抵達東閘", "B hold branch");

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const resetPage = await resetContext.newPage();
  await resetPage.goto(`${baseURL}/role-1.html`);
  await resetPage.evaluate(() => localStorage.setItem("momey-a2:shared", "keep"));
  await resetPage.locator('[data-command-process="closure"]').click();
  await resetPage.locator('[data-command-endpoint="20"]').click();
  await resetPage.locator("[data-reset]").first().click();
  await resetPage.waitForURL(/\/playable-a3\/(?:index\.html)?$/);
  const resetState = await resetPage.evaluate(() => ({
    a3Keys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a3:")),
    a2Value: localStorage.getItem("momey-a2:shared")
  }));
  assert.deepEqual(resetState, { a3Keys: [], a2Value: "keep" }, "reset must clear A3 only");
  await resetContext.close();

  assert.deepEqual(consoleIssues, [], `unexpected browser console issues: ${consoleIssues.join(" | ")}`);
  await browser.close();
  browserHandle = null;
  console.log(JSON.stringify({
    status: "PASS",
    browser: "Playwright fallback with installed Chrome executable",
    viewports: ["1280x900", "390x844", "412x915"],
    screenshots: 15,
    branches: ["A|close", "A|hold", "B|close", "B|hold"],
    refresh: ["command draft", "rescue draft", "safety draft", "completed tools", "verification lock", "consequence"],
    reset: "A3-only PASS",
    consoleIssues
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(async () => {
  if (browserHandle) await browserHandle.close().catch(() => {});
});
