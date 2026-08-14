const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "assets", "dialogue-data.js");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(source, "utf8"), context, { filename: source });
const dialogue = context.window.MOMEY_A9R2_DIALOGUE || {};

const entries = Object.entries(dialogue).map(([id, row]) => {
  const fullPath = path.join(root, row.audio);
  const ready = fs.existsSync(fullPath);
  const bytes = ready ? fs.readFileSync(fullPath) : null;
  return {
    id,
    stage: row.stage,
    trigger: row.trigger,
    captionText: row.caption,
    spokenText: row.spokenText,
    audioFile: row.audio,
    assetStatus: ready ? "READY" : "MISSING",
    bytes: ready ? bytes.length : 0,
    sha256: ready ? crypto.createHash("sha256").update(bytes).digest("hex") : null,
  };
});

const manifest = {
  schema: "momey-a9r2-voice-manifest-v1",
  source: "assets/dialogue-data.js",
  voice: "Kokoro-82M-v1.1-zh / zm_010",
  assetStatus: entries.every((entry) => entry.assetStatus === "READY") ? "READY" : "INCOMPLETE",
  audioFilesPresent: entries.every((entry) => entry.assetStatus === "READY"),
  entries,
};
const output = path.join(root, "assets", "audio", "voice-manifest.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`wrote ${path.relative(root, output)} (${entries.length} entries; ${manifest.assetStatus})`);
