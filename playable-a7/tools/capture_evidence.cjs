const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "screenshots");
const modulePath = process.env.MOMEY_A7_PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(modulePath);

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".mp3": "audio/mpeg"
};

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname.replace(/^\/playable-a7\/?/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end("not found"); return;
    }
    response.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function shot(page, name, fullPage = false) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, name), fullPage });
}

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return { context, page };
}

async function roleToResult(page, baseURL, role, seed, diagnostic) {
  await page.goto(`${baseURL}/role-${role}.html?seed=${seed}`, { waitUntil: "networkidle" });
  await page.locator(`[data-diagnostic="${diagnostic}"]`).click();
  await page.locator("[data-role-start]").click();
  await page.locator("[data-confirm-diagnostic]").click();
}

async function roleToDecision(page, baseURL, role, seed, diagnostic) {
  await roleToResult(page, baseURL, role, seed, diagnostic);
  await page.locator("[data-share-result]").click();
  await page.locator("[data-group-gate]").click();
}

async function roleToEnding(page, baseURL, role, seed, diagnostic, decision) {
  await roleToDecision(page, baseURL, role, seed, diagnostic);
  await page.locator(`[data-decision="${decision}"]`).click();
  await page.locator("[data-agreement-confirm]").click();
  await page.locator("[data-confirm-decision]").click();
}

(async () => {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  const server = await startServer();
  const baseURL = `http://127.0.0.1:${server.address().port}/playable-a7`;
  const chrome = [
    process.env.MOMEY_A7_CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean).find(fs.existsSync);
  const browser = await chromium.launch(chrome ? { headless: true, executablePath: chrome } : { headless: true });
  try {
    const entry = await newPage(browser);
    try {
      await entry.page.goto(`${baseURL}/?seed=EVIDENCE-INTRO`, { waitUntil: "networkidle" });
      await shot(entry.page, "01_story_beat_1_place_390x844.png");
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "02_story_beat_2_lin_rui_390x844.png");
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "03_story_beat_3_gao_cheng_390x844.png");
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "04_story_beat_4_incident_390x844.png");
      await entry.page.locator("[data-intro-next]").click();
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "05_story_beat_6_facility_map_390x844.png", true);
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "06_story_beat_7_tradeoff_390x844.png", true);
      await entry.page.locator("[data-intro-next]").click();
      await shot(entry.page, "07_story_beat_8_team_390x844.png");
    } finally { await entry.context.close(); }

    for (const role of [1, 2, 3]) {
      const opened = await newPage(browser);
      try {
        await opened.page.goto(`${baseURL}/role-${role}.html?seed=ROLE-${role}`, { waitUntil: "networkidle" });
        await shot(opened.page, `${String(7 + role).padStart(2, "0")}_role_${role}_first_screen_390x844.png`);
      } finally { await opened.context.close(); }
    }

    const diagnostic = await newPage(browser);
    try {
      await diagnostic.page.goto(`${baseURL}/role-3.html?seed=DIAGNOSTIC`, { waitUntil: "networkidle" });
      await diagnostic.page.locator('[data-diagnostic="S1"]').click();
      await diagnostic.page.locator("[data-role-start]").click();
      await shot(diagnostic.page, "11_plain_diagnostic_choice_390x844.png");
      await diagnostic.page.locator("[data-confirm-diagnostic]").click();
      await shot(diagnostic.page, "12_result_two_bullets_390x844.png");
    } finally { await diagnostic.context.close(); }

    const decision = await newPage(browser, { width: 412, height: 915 });
    try {
      await roleToDecision(decision.page, baseURL, 2, "DECISION", "R1");
      await shot(decision.page, "13_final_names_first_decision_412x915.png", true);
    } finally { await decision.context.close(); }

    const close = await newPage(browser, { width: 412, height: 915 });
    try {
      await roleToEnding(close.page, baseURL, 1, "CASE1", "O1", "close");
      await shot(close.page, "14_consequence_close_breakline_412x915.png");
    } finally { await close.context.close(); }

    const hold = await newPage(browser, { width: 412, height: 915 });
    try {
      await roleToEnding(hold.page, baseURL, 3, "CASE0", "S2", "hold");
      await shot(hold.page, "15_consequence_hold_backwash_412x915.png");
    } finally { await hold.context.close(); }

    const reference = await newPage(browser, { width: 412, height: 915 });
    try {
      await reference.page.goto(`${baseURL}/role-3.html?seed=REFERENCE`, { waitUntil: "networkidle" });
      await reference.page.locator('[data-diagnostic="S1"]').click();
      await reference.page.locator("[data-role-start]").click();
      await reference.page.locator("[data-reference-open]").click();
      await shot(reference.page, "16_reopenable_map_reference_412x915.png", true);
    } finally { await reference.context.close(); }

    const files = fs.readdirSync(output).filter((file) => file.endsWith(".png")).sort();
    fs.writeFileSync(path.join(output, "README.md"), "# Screenshots\n\n16 張最終 A7 功能證據；完整說明見上一層 `SCREENSHOT_INDEX.md`。\n", "utf8");
    console.log(JSON.stringify({ status: "PASS", count: files.length, files }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
