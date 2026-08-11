const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const playwrightModule = process.env.MOMEY_A4_PLAYWRIGHT_MODULE;
if (!playwrightModule) throw new Error("Set MOMEY_A4_PLAYWRIGHT_MODULE to an installed Playwright module path before running this optional smoke.");
const { chromium } = require(playwrightModule);

const baseURL = process.env.MOMEY_A4_BASE_URL || "http://127.0.0.1:4173/playable-a4";
const chromePath = process.env.MOMEY_A4_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const screenshotRoot = process.env.MOMEY_A4_SCREENSHOT_ROOT
  ? path.resolve(process.env.MOMEY_A4_SCREENSHOT_ROOT)
  : path.resolve(process.cwd(), "screenshots");
const runTimeoutMs = Number(process.env.MOMEY_A4_SMOKE_TIMEOUT_MS || 90000);
fs.mkdirSync(screenshotRoot, { recursive: true });

const consoleIssues = [];
let browserHandle = null;
let watchdog = null;

function contains(value, expected, message) {
  assert.ok(value.includes(expected), `${message}: expected ${JSON.stringify(expected)} in ${JSON.stringify(value)}`);
}

function observe(page, label) {
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(10000);
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleIssues.push(`${label} ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`${label} pageerror: ${error.message}`));
}

async function capture(page, filename) {
  await page.screenshot({ path: path.join(screenshotRoot, filename), fullPage: true });
}

async function captureElement(page, selector, filename) {
  await page.locator(selector).screenshot({ path: path.join(screenshotRoot, filename) });
}

async function assertHealthy(page) {
  const checks = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    frameworkOverlay: /Vite|Webpack|Next\.js|Application error/i.test(document.body.innerText)
  }));
  assert.equal(checks.horizontalOverflow, false, "page must not have horizontal overflow");
  assert.equal(checks.frameworkOverlay, false, "page must not show a framework error overlay");
}

async function assertTouchTargets(page, selector) {
  const boxes = await page.locator(selector).evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
  assert.ok(boxes.length > 0, `expected visible touch targets for ${selector}`);
  for (const box of boxes) {
    assert.ok(box.width >= 44 && box.height >= 44, `${selector} target too small: ${box.width}x${box.height}`);
  }
}

async function clearA4(page) {
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("momey-a4:")).forEach((key) => localStorage.removeItem(key)));
}

async function completeCommandTool(page) {
  await page.locator('[data-command-process="closure"]').click();
  await page.locator('[data-command-endpoint="20"]').click();
  await page.locator('[data-command-process="rescue"]').click();
  await page.locator('[data-command-endpoint="95"]').click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
}

async function prepareCommandSeat(page, initialJudgment = "unsure") {
  await page.goto(`${baseURL}/role-1.html`);
  await completeCommandTool(page);
  assert.equal(await page.locator("[data-team-ready]").count(), 0, "sharing confirmation must not exist before initial judgment");
  await page.locator(`[data-initial-judgment="${initialJudgment}"]`).click();
  await page.locator("[data-team-ready]").click();
  assert.equal(await page.locator(".compact-board > div").count(), 3);
  assert.equal(await page.locator(`[data-initial-judgment="${initialJudgment}"]`).isDisabled(), true, "initial baseline must lock after sharing");
}

async function completeVerificationAndReconsideration(page, verification, reconsideration) {
  await page.locator(`[data-verify-option="${verification}"]`).click();
  assert.equal(await page.locator("[data-verification-result]").count(), 0);
  await page.locator("[data-verify-confirm]").click();
  assert.equal(await page.locator("[data-verification-result]").isVisible(), true);
  assert.equal(await page.locator("[data-final-choice]").count(), 0, "final must remain locked before reconsideration discussion");
  await page.locator(`[data-reconsideration="${reconsideration}"]`).click();
  assert.equal(await page.locator("[data-final-choice]").count(), 0, "reconsideration alone must not unlock final");
  await page.locator("[data-post-verification-ready]").click();
  assert.equal(await page.locator("[data-final-choice]").count(), 2, "postVerificationReady must unlock two-step final");
}

async function finishSeat(page, verification, reconsideration, finalChoice) {
  await page.locator("[data-team-ready]").click();
  await completeVerificationAndReconsideration(page, verification, reconsideration);
  await page.locator(`[data-final-choice="${finalChoice}"]`).click();
  await page.locator("[data-final-confirm]").click();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true);
}

async function runBranch(browser, verification, finalChoice, reconsideration) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  observe(page, `branch-${verification}-${finalChoice}`);
  try {
    await prepareCommandSeat(page, "unsure");
    await completeVerificationAndReconsideration(page, verification, reconsideration);
    await page.locator(`[data-final-choice="${finalChoice}"]`).click();
    await page.locator("[data-final-confirm]").click();
    const consequence = await page.locator(".consequence-stage").innerText();
    contains(consequence, "後來確認", `${verification}|${finalChoice} consequence`);
    return consequence;
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  watchdog = setTimeout(() => {
    console.error(`A4 rendered smoke exceeded ${runTimeoutMs}ms watchdog.`);
    process.exitCode = 1;
    if (browserHandle) browserHandle.close().catch(() => {});
  }, runTimeoutMs);

  browserHandle = await chromium.launch({ headless: true, executablePath: chromePath });
  const browser = browserHandle;

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  observe(desktop, "desktop");
  await desktop.goto(`${baseURL}/`);
  assert.match(await desktop.title(), /MOMEY A4/);
  assert.equal(await desktop.locator(".story-panel").count(), 6);
  contains(await desktop.locator("h1").innerText(), "海岬防洪站", "entry heading");
  await capture(desktop, "01-entry.png");
  await assertHealthy(desktop);

  await desktop.setViewportSize({ width: 390, height: 844 });
  await clearA4(desktop);
  await desktop.goto(`${baseURL}/role-1.html`);
  assert.equal(await desktop.locator("[data-role-result]").isVisible(), false);
  await capture(desktop, "02-command-before.png");
  await desktop.locator('[data-command-process="closure"]').click();
  await desktop.locator('[data-command-endpoint="95"]').click();
  contains(await desktop.locator("[data-command-instruction]").innerText(), "不是", "gentle correction");
  await desktop.reload();
  contains(await desktop.locator("[data-command-instruction]").innerText(), "不是", "command draft refresh");
  await desktop.locator('[data-command-endpoint="20"]').click();
  await desktop.locator('[data-command-process="rescue"]').click();
  await desktop.locator('[data-command-endpoint="95"]').click();
  assert.equal(await desktop.locator("[data-role-result]").isVisible(), true);
  await capture(desktop, "03-command-complete.png");

  assert.equal(await desktop.locator("[data-initial-judgment]").count(), 3);
  await assertTouchTargets(desktop, "[data-initial-judgment]");
  await desktop.locator('[data-initial-judgment="hold"]').click();
  await desktop.reload();
  contains(await desktop.locator("[data-initial-judgment-state]").innerText(), "維持救援窗口", "initial judgment refresh");
  await desktop.locator('[data-initial-judgment="unsure"]').click();
  await captureElement(desktop, ".judgment-panel", "04-initial-judgment.png");
  await captureElement(desktop, ".sharing-stage", "05-open-sharing.png");
  await desktop.locator("[data-team-ready]").click();
  contains(await desktop.locator("[data-initial-judgment-memory]").innerText(), "還不能判斷", "baseline memory");
  assert.equal(await desktop.locator(".compact-board > div").count(), 3);
  await captureElement(desktop, ".sharing-stage", "06-compact-board.png");
  await captureElement(desktop, ".unknowns-stage", "07-unresolved-unknowns.png");

  await desktop.locator('[data-verify-option="A"]').click();
  await desktop.locator('[data-verify-option="B"]').click();
  assert.equal(await desktop.locator('[data-verify-option="B"]').getAttribute("aria-pressed"), "true");
  await desktop.locator('[data-verify-option="A"]').click();
  assert.equal(await desktop.locator("[data-verification-result]").count(), 0);
  await captureElement(desktop, ".verification-stage", "08-verification-draft.png");
  await desktop.locator("[data-verify-confirm]").click();
  assert.equal(await desktop.locator("[data-verification-result]").isVisible(), true);
  await desktop.reload();
  assert.equal(await desktop.locator("[data-verification-result]").isVisible(), true);
  assert.equal(await desktop.locator('[data-verify-option="B"]').isDisabled(), true);
  await captureElement(desktop, ".verification-stage", "09-verification-result.png");

  assert.equal(await desktop.locator("[data-reconsideration]").count(), 3);
  await assertTouchTargets(desktop, "[data-reconsideration]");
  contains(await desktop.locator(".baseline-row").innerText(), "還不能判斷", "reconsideration baseline");
  await desktop.locator('[data-reconsideration="changed"]').click();
  await desktop.reload();
  contains(await desktop.locator("[data-reconsideration-state]").innerText(), "改變了", "reconsideration refresh");
  assert.equal(await desktop.locator("[data-final-choice]").count(), 0);
  await captureElement(desktop, ".reconsideration-stage", "10-reconsideration.png");
  await desktop.locator("[data-post-verification-ready]").click();
  assert.equal(await desktop.locator("[data-final-choice]").count(), 2);
  await assertTouchTargets(desktop, "[data-final-choice]");
  await captureElement(desktop, ".reconsideration-stage", "11-post-verification-discussion.png");

  await desktop.locator('[data-final-choice="close"]').click();
  await desktop.locator('[data-final-choice="hold"]').click();
  await captureElement(desktop, ".decision-stage", "12-final-summary.png");
  await desktop.locator("[data-final-confirm]").click();
  assert.equal(await desktop.locator(".consequence-stage").isVisible(), true);
  await desktop.reload();
  assert.equal(await desktop.locator(".consequence-stage").isVisible(), true);
  contains(await desktop.locator(".human-question").innerText(), "如果重來一次", "single consequence reflection");
  await captureElement(desktop, ".consequence-stage", "13-consequence.png");
  await assertHealthy(desktop);

  const rescueContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const rescue = await rescueContext.newPage();
  observe(rescue, "rescue");
  try {
    await rescue.goto(`${baseURL}/role-2.html`);
    for (const key of ["signature", "response"]) await rescue.locator(`[data-inspect-field="${key}"]`).click();
    await rescue.reload();
    contains(await rescue.locator("[data-rescue-instruction]").innerText(), "已看 2/4", "rescue draft refresh");
    for (const key of ["freshness", "route"]) await rescue.locator(`[data-inspect-field="${key}"]`).click();
    assert.equal(await rescue.locator("[data-role-result]").isVisible(), true);
    assert.equal(await rescue.locator("[data-initial-judgment]").count(), 3);
    await rescue.locator('[data-initial-judgment="hold"]').click();
    await captureElement(rescue, ".action-result", "14-rescue-judgment.png");
    await finishSeat(rescue, "A", "unchanged", "close");
    await assertHealthy(rescue);
  } finally {
    await rescueContext.close().catch(() => {});
  }

  const safetyContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const safety = await safetyContext.newPage();
  observe(safety, "safety");
  try {
    await safety.goto(`${baseURL}/role-3.html`);
    await safety.locator('[data-pressure-marker="40"]').click();
    contains(await safety.locator("[data-safety-instruction]").innerText(), "中間投影", "safety intermediate state");
    await safety.reload();
    assert.equal(await safety.locator("[data-pressure-range]").getAttribute("value"), "40");
    await safety.locator('[data-pressure-marker="95"]').click();
    assert.equal(await safety.locator("[data-role-result]").isVisible(), true);
    await safety.locator('[data-initial-judgment="close"]').click();
    await captureElement(safety, ".action-result", "15-safety-judgment.png");
    await finishSeat(safety, "A", "unchanged", "close");
    await assertHealthy(safety);
  } finally {
    await safetyContext.close().catch(() => {});
  }

  const branchResults = await Promise.all([
    runBranch(browser, "A", "close", "changed"),
    runBranch(browser, "A", "hold", "unchanged"),
    runBranch(browser, "B", "close", "still-unsure"),
    runBranch(browser, "B", "hold", "changed")
  ]);
  contains(branchResults[0], "西側推車路線被切斷", "A close branch");
  contains(branchResults[1], "救援推車沿可通軌道清出西側路線", "A hold branch");
  contains(branchResults[2], "西側推車路線被切斷", "B close branch");
  contains(branchResults[3], "壓力抵達東閘", "B hold branch");

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const resetPage = await resetContext.newPage();
  observe(resetPage, "reset");
  try {
    await resetPage.goto(`${baseURL}/role-1.html`);
    await resetPage.evaluate(() => {
      localStorage.setItem("momey-a1:shared", "keep-a1");
      localStorage.setItem("momey-a2:shared", "keep-a2");
      localStorage.setItem("momey-a3:shared", "keep-a3");
      localStorage.setItem("momey-a4:shared", "remove-a4");
    });
    await resetPage.locator("[data-reset]").first().click();
    await resetPage.waitForURL(/\/playable-a4\/(?:index\.html)?$/);
    const state = await resetPage.evaluate(() => ({
      a4Keys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a4:")),
      a1: localStorage.getItem("momey-a1:shared"),
      a2: localStorage.getItem("momey-a2:shared"),
      a3: localStorage.getItem("momey-a3:shared")
    }));
    assert.deepEqual(state, { a4Keys: [], a1: "keep-a1", a2: "keep-a2", a3: "keep-a3" });
  } finally {
    await resetContext.close().catch(() => {});
  }

  assert.deepEqual(consoleIssues, [], `unexpected browser console issues: ${consoleIssues.join(" | ")}`);
  console.log(JSON.stringify({
    status: "PASS",
    route: baseURL,
    viewports: ["1280x900", "390x844", "412x915"],
    socialFlow: ["initialJudgment", "openSharing", "verification", "reconsideration", "postVerificationReady", "final", "consequence"],
    branches: ["A|close", "A|hold", "B|close", "B|hold"],
    reset: "A4-only",
    consoleIssues
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(async () => {
  if (watchdog) clearTimeout(watchdog);
  if (browserHandle) await browserHandle.close().catch(() => {});
  browserHandle = null;
});
