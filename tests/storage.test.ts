import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyData, saveData, readData, deleteStudent } from "../src/storage";
import { newProfile, type Attempt } from "../src/types";
import { hashPin, salt, validPin } from "../src/security";
test("IndexedDB persistence, ordered writes, and deletion remove every associated record", async () => {
  const data = emptyData();
  const a = newProfile("Alex"),
    b = newProfile("Sam");
  data.profiles = [a, b];
  data.selected = a.id;
  data.checkpoints[a.id + ":1"] = { test: true };
  data.checkpoints[a.id + ":11:practice"] = { test: true };
  data.checkpoints[b.id + ":1"] = { test: true };
  for (const p of [a, b]) {
    data.sessions.push({
      id: "session-" + p.id,
      studentId: p.id,
      startedAt: 1,
      duration: 45,
      levels: [1],
      results: [],
      practice: false,
      exitScores: {},
    });
    for (let i = 0; i < 10; i++)
      data.attempts.push({
        id: p.id + i,
        studentId: p.id,
        sessionId: "session-" + p.id,
        level: 1,
        templateId: "addend_01",
        skill: "missing_addend",
        trap: i % 2 ? "adding_instead_of_subtracting" : "",
        params: [10, 20],
        equation: "□ + 10 = 20",
        answer: 10,
        given: i % 2 ? 30 : 10,
        correct: i % 2 === 0,
        first: true,
        scaffold: i % 2 ? "bar" : "",
        timeMs: 1000,
        timestamp: i,
      } satisfies Attempt);
  }
  await saveData(data);
  let restored = await readData();
  assert.deepEqual(restored, data);
  const logs = restored.attempts.filter(
    (a) => a.studentId === restored.selected,
  );
  assert.equal(
    logs.filter((a) => a.first && a.correct).length /
      logs.filter((a) => a.first).length,
    0.5,
  );
  assert.equal(
    logs.filter((a) => a.trap === "adding_instead_of_subtracting").length,
    5,
  );
  deleteStudent(restored, a.id);
  await saveData(restored);
  restored = await readData();
  assert(!restored.profiles.some((p) => p.id === a.id));
  assert(!restored.attempts.some((x) => x.studentId === a.id));
  assert(!restored.sessions.some((x) => x.studentId === a.id));
  assert(
    !Object.keys(restored.checkpoints).some((x) => x.startsWith(a.id + ":")),
  );
  assert.equal(restored.attempts.length, 10);
  assert.equal(restored.selected, b.id);
  const one = saveData({ ...restored, selected: "first" }),
    two = saveData({ ...restored, selected: b.id });
  await Promise.all([one, two]);
  assert.equal((await readData()).selected, b.id);
  await saveData(emptyData());
  assert.deepEqual(await readData(), emptyData());
});
test("PINs have salted derived hashes, reject wrong PINs and enforce input shape", async () => {
  assert(validPin("1234"));
  assert(validPin("123456"));
  assert(!validPin("123"));
  assert(!validPin("1234567"));
  assert(!validPin("abcd"));
  const a = salt(),
    b = salt();
  assert.notEqual(a, b);
  const h = await hashPin("2468", a);
  assert.equal(h.length, 64);
  assert.notEqual(h, "2468");
  assert.equal(h, await hashPin("2468", a));
  assert.notEqual(h, await hashPin("2468", b));
  assert.notEqual(h, await hashPin("0000", a));
});

test("The configured tutor login accepts 110401 for fresh and existing installations", async () => {
  const fresh = emptyData();
  assert.equal(
    await hashPin("110401", fresh.settings.salt),
    fresh.settings.pinHash,
  );
  assert.notEqual(
    await hashPin("000000", fresh.settings.salt),
    fresh.settings.pinHash,
  );
  const legacy = emptyData(),
    profile = newProfile("Existing pilot");
  legacy.profiles.push(profile);
  legacy.selected = profile.id;
  profile.stars[1] = 3;
  legacy.checkpoints[profile.id + ":1"] = { score: 1234 };
  delete legacy.settings.tutorCredentialRevision;
  legacy.settings.salt = salt();
  legacy.settings.pinHash = await hashPin("2468", legacy.settings.salt);
  await saveData(legacy);
  const migrated = await readData();
  assert.equal(
    await hashPin("110401", migrated.settings.salt),
    migrated.settings.pinHash,
  );
  assert.deepEqual(migrated.profiles, legacy.profiles);
  assert.deepEqual(migrated.checkpoints, legacy.checkpoints);
  // A later deliberate PIN change must survive reload instead of being reset.
  migrated.settings.salt = salt();
  migrated.settings.pinHash = await hashPin("123456", migrated.settings.salt);
  await saveData(migrated);
  const changed = await readData();
  assert.equal(changed.settings.pinHash, migrated.settings.pinHash);
  await saveData(emptyData());
});
