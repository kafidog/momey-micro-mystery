const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets', 'dialogue-data.js');
const output = path.join(root, 'assets', 'audio', 'voice-manifest.json');
const code = fs.readFileSync(source, 'utf8');
const context = { window: {} };
vm.runInNewContext(code, context, { filename: source });
const dialogue = context.window.MOMEY_A7_DIALOGUE;
if (!Array.isArray(dialogue) || dialogue.length === 0) {
  throw new Error('dialogue-data.js did not expose a non-empty MOMEY_A7_DIALOGUE array');
}

const entries = dialogue.map((row) => ({
  id: row.DIALOGUE_ID,
  captionText: row.CAPTION_TEXT,
  spokenText: row.VOICE_TEXT || null,
  audioFile: row.AUDIO_FILE || null,
  engine: 'Kokoro-82M-v1.1-zh',
  voice: 'zm_010',
  assetStatus: row.AUDIO_FILE
    ? (fs.existsSync(path.join(root, row.AUDIO_FILE)) ? 'READY' : 'PENDING')
    : 'TEXT_ONLY',
  stage: row.STAGE,
  profile: row.PROFILE,
  trigger: row.TRIGGER,
  meaningTag: row.MEANING_TAG
}));

const audioEntries = entries.filter((entry) => entry.audioFile);
const manifest = {
  schema: 'momey-a7-static-voice-v1',
  engine: 'Kokoro-82M-v1.1-zh',
  voice: 'zm_010',
  assetStatus: audioEntries.every((entry) => entry.assetStatus === 'READY') ? 'READY' : 'PENDING_AUDIO',
  audioFilesPresent: audioEntries.length > 0 && audioEntries.every((entry) => entry.assetStatus === 'READY'),
  generatedFrom: 'assets/dialogue-data.js',
  entries
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`wrote ${entries.length} voice entries to ${path.relative(root, output)}`);
