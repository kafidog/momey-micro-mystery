import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseline = "5f34002309edeab5d9afd6c39e45f490cf7dfb2b";

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("A9R2 work stays inside playable-a9r2 and worker-a9r2", () => {
  const changed = git(["diff", "--name-only", baseline]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const outside = [...new Set([...changed, ...untracked])].filter((file) => !/^(playable-a9r2|worker-a9r2)\//.test(file.replaceAll("\\", "/")));
  assert.deepEqual(outside, []);
});
