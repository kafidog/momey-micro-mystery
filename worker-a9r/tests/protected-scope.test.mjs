import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseline = "e43413f2eec70dd233eeec440c83ec6169cde74d";

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("A9R work stays inside playable-a9r and worker-a9r", () => {
  const changed = git(["diff", "--name-only", baseline]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const outside = [...new Set([...changed, ...untracked])].filter((file) => !/^(playable-a9r|worker-a9r)\//.test(file.replaceAll("\\", "/")));
  assert.deepEqual(outside, []);
});
