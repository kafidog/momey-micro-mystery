const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const playwrightModule = process.env.MOMEY_A5_PLAYWRIGHT_MODULE;
if (!playwrightModule) throw new Error("Set MOMEY_A5_PLAYWRIGHT_MODULE to an installed Playwright module path.");
const { chromium } = require(playwrightModule);

const baseURL = process.env.MOMEY_A5_BASE_URL || "http://127.0.0.1:4175/playable-a5";
const chromePath = process.env.MOMEY_A5_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const screenshotRoot = path.resolve(process.env.MOMEY_A5_SCREENSHOT_ROOT || path.join(process.cwd(), "screenshots"));
const runTimeoutMs = Number(process.env.MOMEY_A5_SMOKE_TIMEOUT_MS || 120000);
fs.mkdirSync(screenshotRoot, { recursive: true });

const consoleIssues = [];
let browserHandle;
let watchdog;

function observe(page, label) {
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(12000);
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleIssues.push(`${label} ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`${label} pageerror: ${error.message}`));
}

async function capture(page, filename) {
  await page.screenshot({ path: path.join(screenshotRoot, filename), fullPage: false });
}

async function captureElement(page, selector, filename) {
  await page.locator(selector).screenshot({ path: path.join(screenshotRoot, filename) });
}

async function clearA5(page) {
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("momey-a5:")).forEach((key) => localStorage.removeItem(key)));
}

async function assertHealthy(page) {
  const state = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    overlay: /Vite|Webpack|Next\.js|Application error|Internal Server Error/i.test(document.body.innerText)
  }));
  assert.equal(state.horizontalOverflow, false, "horizontal overflow");
  assert.equal(state.overlay, false, "framework/runtime overlay");
}

async function assertTouchTargets(page, selector) {
  const boxes = await page.locator(selector).evaluateAll((elements) => elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
  assert.ok(boxes.length > 0, `no visible targets for ${selector}`);
  for (const box of boxes) assert.ok(box.width >= 44 && box.height >= 44, `${selector}: ${box.width}x${box.height}`);
}

async function completeCommandTool(page) {
  await page.locator('[data-command-process="closure"]').click();
  await page.locator('[data-command-endpoint="20"]').click();
  await page.locator('[data-command-process="rescue"]').click();
  await page.locator('[data-command-endpoint="95"]').click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
}

async function completeRescueTool(page) {
  for (const field of ["signature", "response", "freshness", "route"]) await page.locator(`[data-inspect-field="${field}"]`).click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
}

async function completeSafetyTool(page) {
  await page.locator('[data-pressure-marker="40"]').click();
  await page.locator('[data-pressure-marker="95"]').click();
  assert.equal(await page.locator("[data-role-result]").isVisible(), true);
}

async function prepareCommand(page, judgment = "unsure") {
  await page.goto(`${baseURL}/role-1.html`);
  await clearA5(page);
  await page.reload();
  await completeCommandTool(page);
  await page.locator(`[data-initial-judgment="${judgment}"]`).click();
}

async function authorize(page, verification) {
  await page.locator("[data-exchange-complete]").click();
  await page.locator(`[data-verify-option="${verification}"]`).click();
  await page.locator("[data-verify-confirm]").click();
  assert.equal(await page.locator("[data-command-handoff]").isVisible(), true);
  assert.equal(await page.locator(".verified-evidence").count(), 0, "Command must not render detailed result");
}

async function finishCommand(page, finalChoice) {
  await page.locator("[data-report-heard]").click();
  assert.equal(await page.locator("[data-final-choice]").count(), 2);
  await page.locator(`[data-final-choice="${finalChoice}"]`).click();
  await page.locator("[data-final-confirm]").click();
  assert.equal(await page.locator(".consequence-stage").isVisible(), true);
}

async function runBranch(browser, verification, finalChoice) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  observe(page, `branch-${verification}-${finalChoice}`);
  try {
    await prepareCommand(page, "unsure");
    await authorize(page, verification);
    await finishCommand(page, finalChoice);
    const result = await page.locator(".consequence-stage").innerText();
    assert.match(result, /後來確認/);
    await assertHealthy(page);
    return result;
  } finally {
    await context.close();
  }
}

async function main() {
  watchdog = setTimeout(() => {
    console.error(`A5 smoke exceeded ${runTimeoutMs}ms`);
    process.exitCode = 1;
    if (browserHandle) browserHandle.close().catch(() => {});
  }, runTimeoutMs);

  browserHandle = await chromium.launch({ headless: true, executablePath: chromePath });
  const browser = browserHandle;

  const entry = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  observe(entry, "entry");
  await entry.goto(`${baseURL}/`);
  assert.match(await entry.title(), /MOMEY A5/);
  assert.equal(await entry.locator(".story-panel").count(), 6);
  await assertHealthy(entry);
  await capture(entry, "01-entry-comic.png");

  const commandContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const rescueContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const safetyContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const command = await commandContext.newPage();
  const rescue = await rescueContext.newPage();
  const safety = await safetyContext.newPage();
  observe(command, "command-A");
  observe(rescue, "rescue-A");
  observe(safety, "safety-A");

  try {
    await command.goto(`${baseURL}/role-1.html`);
    await rescue.goto(`${baseURL}/role-2.html`);
    await safety.goto(`${baseURL}/role-3.html`);
    await Promise.all([clearA5(command), clearA5(rescue), clearA5(safety)]);
    await Promise.all([command.reload(), rescue.reload(), safety.reload()]);

    await captureElement(command, ".role-tool-panel", "02-command-tool.png");
    await captureElement(rescue, ".role-tool-panel", "03-rescue-tool.png");
    await captureElement(safety, ".role-tool-panel", "04-safety-tool.png");

    await completeCommandTool(command);
    await completeRescueTool(rescue);
    await completeSafetyTool(safety);
    await command.locator('[data-initial-judgment="unsure"]').click();
    await rescue.locator('[data-initial-judgment="hold"]').click();
    await safety.locator('[data-initial-judgment="close"]').click();
    await assertTouchTargets(command, "[data-initial-judgment]");
    await captureElement(command, ".judgment-panel", "05-personal-current-judgment.png");

    await command.reload();
    assert.match(await command.locator("[data-initial-judgment-state]").innerText(), /還不能判斷/);
    await command.locator("[data-exchange-complete]").click();
    assert.equal(await command.locator(".compact-board > div").count(), 3);
    await captureElement(command, ".sharing-stage", "06-command-exchange-complete.png");

    await command.locator('[data-verify-option="A"]').click();
    await command.locator('[data-verify-option="B"]').click();
    await command.locator('[data-verify-option="A"]').click();
    assert.equal(await command.locator('[data-verify-option="A"]').getAttribute("aria-pressed"), "true");
    await captureElement(command, ".verification-stage", "07-command-verification-draft.png");
    await command.locator("[data-verify-confirm]").click();
    assert.equal(await command.locator(".verified-evidence").count(), 0);
    await captureElement(command, "[data-command-handoff]", "08-command-a-authorization.png");

    assert.equal(await rescue.locator(".verified-evidence").count(), 0);
    await rescue.locator('[data-specialist-arm="A"]').click();
    assert.equal(await rescue.locator(".verified-evidence").count(), 0, "arming must not reveal A");
    await rescue.reload();
    assert.equal(await rescue.locator('[data-specialist-execute="A"]').isVisible(), true, "armed A gate must refresh");
    await captureElement(rescue, '[data-specialist-stage="A"]', "09-rescue-a-gate.png");
    await rescue.locator('[data-specialist-execute="A"]').click();
    assert.equal(await rescue.locator(".verified-evidence").isVisible(), true);
    await captureElement(rescue, '[data-specialist-stage="A"]', "10-rescue-a-result.png");
    assert.equal(await rescue.locator("[data-final-choice]").count(), 0);

    await command.locator("[data-report-heard]").click();
    await captureElement(command, ".discussion-question", "13-human-reconsideration.png");
    await assertTouchTargets(command, "[data-final-choice]");
    await command.locator('[data-final-choice="close"]').click();
    await command.locator('[data-final-choice="hold"]').click();
    await captureElement(command, ".decision-stage", "14-command-final-summary.png");
    await command.locator("[data-final-confirm]").click();
    await captureElement(command, ".consequence-stage", "16-shared-consequence.png");
    await command.reload();
    assert.equal(await command.locator(".consequence-stage").isVisible(), true);
    await captureElement(rescue, ".role-end", "17-specialist-role-end.png");
    await capture(command, "18-mobile-command.png");

    await Promise.all([assertHealthy(command), assertHealthy(rescue), assertHealthy(safety)]);
  } finally {
    await Promise.all([commandContext.close(), rescueContext.close(), safetyContext.close()]);
  }

  const bCommandContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const bSafetyContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const bCommand = await bCommandContext.newPage();
  const bSafety = await bSafetyContext.newPage();
  observe(bCommand, "command-B");
  observe(bSafety, "safety-B");
  try {
    await prepareCommand(bCommand, "close");
    await bSafety.goto(`${baseURL}/role-3.html`);
    await clearA5(bSafety);
    await bSafety.reload();
    await completeSafetyTool(bSafety);
    await bSafety.locator('[data-initial-judgment="close"]').click();
    await authorize(bCommand, "B");
    await captureElement(bCommand, "[data-command-handoff]", "11-command-b-authorization.png");
    await bSafety.locator('[data-specialist-arm="B"]').click();
    assert.equal(await bSafety.locator(".verified-evidence").count(), 0);
    await bSafety.locator('[data-specialist-cancel="B"]').click();
    assert.equal(await bSafety.locator(".verified-evidence").count(), 0);
    await bSafety.locator('[data-specialist-arm="B"]').click();
    await bSafety.locator('[data-specialist-execute="B"]').click();
    assert.equal(await bSafety.locator(".verified-evidence").isVisible(), true);
    await captureElement(bSafety, '[data-specialist-stage="B"]', "12-safety-b-result.png");
    await finishCommand(bCommand, "close");
    await captureElement(bCommand, ".decision-stage .draft-row", "15-command-final-confirmed.png");
    assert.equal(await bSafety.locator("[data-final-choice]").count(), 0);
    assert.equal(await bSafety.locator(".consequence-stage").count(), 0);
  } finally {
    await Promise.all([bCommandContext.close(), bSafetyContext.close()]);
  }

  const branches = await Promise.all([
    runBranch(browser, "A", "close"),
    runBranch(browser, "A", "hold"),
    runBranch(browser, "B", "close"),
    runBranch(browser, "B", "hold")
  ]);
  assert.match(branches[0], /林芮當時仍活著/);
  assert.match(branches[1], /高承留到控制廊隔離完成/);
  assert.match(branches[2], /林芮當時仍活著/);
  assert.match(branches[3], /救援推車把林芮帶出/);

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const resetPage = await resetContext.newPage();
  observe(resetPage, "reset");
  try {
    await resetPage.goto(`${baseURL}/role-1.html`);
    await resetPage.evaluate(() => {
      for (const version of ["a1", "a2", "a3", "a4"]) localStorage.setItem(`momey-${version}:shared`, `keep-${version}`);
      localStorage.setItem("momey-a5:command", "remove-a5");
    });
    await resetPage.locator("[data-reset]").first().click();
    await resetPage.waitForURL(/\/playable-a5\/(?:index\.html)?$/);
    const state = await resetPage.evaluate(() => ({
      a5: Object.keys(localStorage).filter((key) => key.startsWith("momey-a5:")),
      older: ["a1", "a2", "a3", "a4"].map((version) => localStorage.getItem(`momey-${version}:shared`))
    }));
    assert.deepEqual(state, { a5: [], older: ["keep-a1", "keep-a2", "keep-a3", "keep-a4"] });
  } finally {
    await resetContext.close();
  }

  assert.deepEqual(consoleIssues, [], consoleIssues.join(" | "));
  const screenshots = fs.readdirSync(screenshotRoot).filter((file) => file.endsWith(".png")).sort();
  assert.equal(screenshots.length, 18, `expected 18 screenshots, got ${screenshots.length}`);
  console.log(JSON.stringify({
    status: "PASS",
    route: baseURL,
    viewports: ["1280x900", "390x844", "412x915"],
    threePhoneA: "PASS",
    threePhoneB: "PASS",
    branches: ["A|close", "A|hold", "B|close", "B|hold"],
    misclick: "arm/cancel reveals no result",
    reset: "A5-only",
    screenshots,
    consoleIssues
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(async () => {
  if (watchdog) clearTimeout(watchdog);
  if (browserHandle) await browserHandle.close().catch(() => {});
});
