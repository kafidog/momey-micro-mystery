const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "assets", "dialogue-data.js");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const dialogue = context.window.MOMEY_A8_DIALOGUE || [];

function assetInfo(audioFile) {
  if (!audioFile) return { assetStatus: "TEXT_ONLY", bytes: 0, sha256: null };
  const file = path.join(root, audioFile);
  if (!fs.existsSync(file)) return { assetStatus: "MISSING", bytes: 0, sha256: null };
  const buffer = fs.readFileSync(file);
  return {
    assetStatus: "READY",
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
}

const entries = dialogue.map((row) => {
  const asset = assetInfo(row.AUDIO_FILE);
  return {
    id: row.DIALOGUE_ID,
    stage: row.STAGE,
    profile: row.PROFILE,
    trigger: row.TRIGGER,
    captionText: row.CAPTION_TEXT,
    spokenText: row.VOICE_TEXT,
    audioFile: row.AUDIO_FILE,
    meaningTag: row.MEANING_TAG,
    ...asset
  };
});

if (process.argv.includes("--print-spoken-lines")) {
  process.stdout.write(JSON.stringify(entries.filter((entry) => entry.audioFile && entry.spokenText)));
  process.exit(0);
}

const manifest = {
  schema: "momey-a8-voice-manifest-v1",
  source: "assets/dialogue-data.js",
  voice: "Kokoro-82M-v1.1-zh / zm_010",
  assetStatus: entries.every((entry) => entry.assetStatus !== "MISSING") ? "READY" : "INCOMPLETE",
  audioFilesPresent: entries.filter((entry) => entry.audioFile).every((entry) => entry.assetStatus === "READY"),
  entries
};
const out = path.join(root, "assets", "audio", "voice-manifest.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(root, out)} (${entries.length} entries)`);
