import test from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS, STORAGE_KEY, localDateKey, dateFromKey, shiftDate, emptyProgress, sanitizeProgress, loadProgress, saveProgress, questRecord, setQuest, totals, redeemReward, weekDays, readingStats } from '../src/progress.js';
const date = (key) => dateFromKey(key);
const day = date('2026-10-28');
test('reading grants exactly 15 XP and 8 coins', () => {
  const state = setQuest(emptyProgress(), day, 'reading', true);
  assert.deepEqual(totals(state), { xp: 15, coins: 8, earnedCoins: 8, level: 1, levelXp: 15 });
  assert.equal(questRecord(state, day, 'reading').complete, true);
});
test('repeated completion, undo/recheck and serialized reload cannot duplicate rewards', () => {
  let state = setQuest(emptyProgress(), day, 'reading', true);
  for (let i = 0; i < 10; i++) state = setQuest(state, day, 'reading', true);
  state = setQuest(state, day, 'reading', false);
  assert.equal(totals(state).xp, 15);
  assert.equal(readingStats(state, day).week, 0);
  state = sanitizeProgress(JSON.parse(JSON.stringify(state)));
  state = setQuest(state, day, 'reading', true);
  assert.equal(totals(state).coins, 8);
});
test('homework and reading are independent; history is immutable and survives storage', () => {
  const original = emptyProgress();
  let state = setQuest(original, day, 'reading', true);
  state = setQuest(state, day, 'homework', true);
  assert.deepEqual(original, emptyProgress());
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  assert.equal(saveProgress(storage, state), true);
  assert.equal(loadProgress(storage).error, null);
  assert.deepEqual(loadProgress(storage).state, state);
  assert.equal(totals(state).xp, 35);
  assert.equal(totals(state).coins, 18);
});
test('rollover presents an incomplete new day without changing yesterday', () => {
  let state = setQuest(emptyProgress(), day, 'reading', true);
  const tomorrow = shiftDate(day, 1);
  assert.equal(questRecord(state, tomorrow, 'reading').complete, false);
  assert.equal(questRecord(state, day, 'reading').complete, true);
  state = setQuest(state, tomorrow, 'reading', true);
  assert.equal(totals(state).xp, 30);
  assert.equal(totals(state).coins, 16);
});
test('date keys use local calendar parts, not UTC ISO dates', () => {
  const local = new Date(2026, 0, 2, 0, 3);
  assert.equal(localDateKey(local), '2026-01-02');
  assert.equal(localDateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});
test('calendar stepping handles year boundary, leap day and DST', () => {
  assert.equal(localDateKey(shiftDate(date('2026-12-31'), 1)), '2027-01-01');
  assert.equal(localDateKey(shiftDate(date('2028-02-28'), 1)), '2028-02-29');
  assert.equal(localDateKey(shiftDate(date('2026-03-08'), 1)), '2026-03-09');
  assert.equal(localDateKey(shiftDate(date('2026-11-01'), -1)), '2026-10-31');
});
test('week runs Monday to Sunday, including Sunday and month boundaries', () => {
  const days = weekDays(date('2026-11-01')).map(localDateKey);
  assert.equal(days[0], '2026-10-26'); assert.equal(days[6], '2026-11-01');
});
test('streak continues through yesterday while today is unfinished, breaks at a gap', () => {
  let state = emptyProgress();
  for (const key of ['2026-10-25', '2026-10-26', '2026-10-27']) state = setQuest(state, date(key), 'reading', true);
  assert.deepEqual(readingStats(state, day), { streak: 3, week: 2 });
  state = setQuest(state, day, 'reading', true);
  assert.deepEqual(readingStats(state, day), { streak: 4, week: 3 });
  assert.equal(readingStats(state, date('2026-10-30')).streak, 0);
});
test('homework is not counted as reading; future records do not increase current week', () => {
  let state = setQuest(emptyProgress(), day, 'homework', true);
  state = setQuest(state, shiftDate(day, 1), 'reading', true);
  assert.deepEqual(readingStats(state, day), { streak: 0, week: 0 });
});
test('level thresholds derive consistently from daily awards', () => {
  let state = emptyProgress();
  for (let i = 0; i < 10; i++) state = setQuest(state, shiftDate(day, -i), 'reading', true);
  assert.equal(totals(state).level, 2); assert.equal(totals(state).levelXp, 0);
});
test('rewards require enough coins, spend once and persist', () => {
  let state = emptyProgress();
  assert.equal(redeemReward(state, 'cushion'), state);
  for (let i = 0; i < 13; i++) state = setQuest(state, shiftDate(day, -i), 'reading', true);
  assert.equal(totals(state).coins, 104);
  state = redeemReward(state, 'cushion');
  assert.equal(totals(state).coins, 4);
  assert.equal(totals(state).xp, 195);
  assert.equal(redeemReward(state, 'cushion'), state);
  assert.deepEqual(sanitizeProgress(state).redeemed, ['cushion']);
});
test('invalid storage is reported and not overwritten', () => {
  let writes = 0;
  const storage = { getItem: () => '{broken', setItem: () => writes++ };
  assert.ok(loadProgress(storage).error);
  assert.equal(writes, 0);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } };
  assert.ok(loadProgress(blocked).error);
  assert.equal(saveProgress(blocked, emptyProgress()), false);
});
test('backup validation rejects incompatible data and sanitizes invalid dates and rewards', () => {
  assert.throws(() => sanitizeProgress({ version: 9, history: {} }));
  const result = sanitizeProgress({ version: 1, history: { '2026-02-30': {}, arbitrary: {}, '2026-10-28': { reading: { complete: true } } }, redeemed: ['cushion', 'cushion', 'unknown'] });
  assert.deepEqual(Object.keys(result.history), ['2026-10-28']);
  assert.equal(totals(result).coins, 8);
  assert.deepEqual(result.redeemed, []);
});
test('configuration values match the brief', () => {
  assert.equal(STORAGE_KEY, 'mission-lecture-lionel-v1');
  assert.deepEqual(SETTINGS.quests.reading, { xp: 15, coins: 8 });
  assert.equal(SETTINGS.xpPerLevel, 150);
});
