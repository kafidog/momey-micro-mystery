import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseline = "d0299dc316d7fcb92f5e51804799d9c5c2fcb074";

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("A9R4 work stays inside playable-a9r4 and worker-a9r4", () => {
  const changed = git(["diff", "--name-only", baseline]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const outside = [...new Set([...changed, ...untracked])].filter((file) => !/^(playable-a9r4|worker-a9r4)\//.test(file.replaceAll("\\", "/")));
  assert.deepEqual(outside, []);
});
