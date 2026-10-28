export const STORAGE_KEY = 'mission-lecture-lionel-v1';
export const SETTINGS = Object.freeze({
  xpPerLevel: 150,
  quests: {
    reading: { xp: 15, coins: 8 },
    homework: { xp: 20, coins: 10 },
  },
  rewards: [
    { id: 'cushion', name: 'Coussin étoilé', icon: '🌟', cost: 100 },
    { id: 'plant', name: 'Plante de la jungle', icon: '🌿', cost: 200 },
    { id: 'cabin', name: 'Cabane de lecture', icon: '🏡', cost: 400 },
  ],
});
const QUEST_IDS = Object.keys(SETTINGS.quests);
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function shiftDate(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}
export function emptyProgress() { return { version: 1, history: {}, redeemed: [] }; }
export function sanitizeProgress(value) {
  if (!value || value.version !== 1 || !value.history || typeof value.history !== 'object' || Array.isArray(value.history)) throw Error('Format invalide');
  const result = emptyProgress();
  for (const [key, record] of Object.entries(value.history)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || localDateKey(dateFromKey(key)) !== key || !record || typeof record !== 'object') continue;
    result.history[key] = Object.fromEntries(QUEST_IDS.map(id => [id, {
      complete: record[id]?.complete === true,
      awarded: record[id]?.awarded === true || record[id]?.complete === true,
    }]));
  }
  result.redeemed = [...new Set(Array.isArray(value.redeemed) ? value.redeemed.filter(id => SETTINGS.rewards.some(r => r.id === id)) : [])];
  // A malformed backup cannot spend more coins than it has earned.
  while (totals(result).coins < 0) result.redeemed.pop();
  return result;
}
export function loadProgress(storage) {
  try { const raw = storage.getItem(STORAGE_KEY); return { state: raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress(), error: null }; }
  catch { return { state: emptyProgress(), error: 'La sauvegarde est inaccessible ou illisible. Elle n’a pas été remplacée.' }; }
}
export function saveProgress(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function questRecord(state, date, quest) { return state.history[localDateKey(date)]?.[quest] || { complete: false, awarded: false }; }
export function setQuest(state, date, quest, complete) {
  if (!QUEST_IDS.includes(quest)) throw Error('Mission inconnue');
  const next = structuredClone(state), key = localDateKey(date);
  next.history[key] ||= {};
  const previous = next.history[key][quest] || {};
  next.history[key][quest] = { complete: Boolean(complete), awarded: previous.awarded === true || Boolean(complete) };
  return next;
}
export function totals(state) {
  let xp = 0, earnedCoins = 0;
  for (const record of Object.values(state.history)) {
    for (const id of QUEST_IDS) if (record[id]?.awarded) { xp += SETTINGS.quests[id].xp; earnedCoins += SETTINGS.quests[id].coins; }
  }
  const spent = SETTINGS.rewards.filter(r => state.redeemed.includes(r.id)).reduce((sum, r) => sum + r.cost, 0);
  return { xp, coins: earnedCoins - spent, earnedCoins, level: 1 + Math.floor(xp / SETTINGS.xpPerLevel), levelXp: xp % SETTINGS.xpPerLevel };
}
export function redeemReward(state, id) {
  const reward = SETTINGS.rewards.find(r => r.id === id);
  if (!reward || state.redeemed.includes(id) || totals(state).coins < reward.cost) return state;
  return { ...state, redeemed: [...state.redeemed, id] };
}
export function weekDays(date = new Date()) {
  const monday = shiftDate(date, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
export function readingStats(state, date = new Date()) {
  const todayKey = localDateKey(date);
  let cursor = date, streak = 0;
  // An unfinished today does not break yesterday's streak until today ends.
  if (!questRecord(state, cursor, 'reading').complete) cursor = shiftDate(cursor, -1);
  while (questRecord(state, cursor, 'reading').complete) { streak++; cursor = shiftDate(cursor, -1); }
  const week = weekDays(date).filter(d => localDateKey(d) <= todayKey && questRecord(state, d, 'reading').complete).length;
  return { streak, week };
}
