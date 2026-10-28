import { createPunctuationPanel } from './punctuation.js';
import { createCoach, createPractice } from './coach.js';
import { createWritingPanel } from './writing.js';
import { createReadingPanel } from './reading.js';
import { SETTINGS, localDateKey, dateFromKey, shiftDate, emptyProgress, sanitizeProgress, loadProgress, saveProgress, questRecord, setQuest, totals, redeemReward, weekDays, readingStats } from './progress.js';
const $ = selector => document.querySelector(selector);
const storage = { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) };
const loaded = loadProgress(storage);
let state = loaded.state, preserveBrokenSave = Boolean(loaded.error);
let today = new Date(), shownMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12), selectedDate = localDateKey(today), toastTimer;
const formatter = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function notify(text) { $('#announcement').textContent = text; $('#announcement').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#announcement').classList.remove('visible'), 4500); }
function notice(message) { $('#storageNotice').hidden = false; $('#storageNotice').textContent = message; }
if (loaded.error) notice(`${loaded.error} Les changements restent temporaires. Exporte-les pour les conserver, ou importe une sauvegarde valide.`);
function persist(next) {
  state = next;
  if (preserveBrokenSave) return false;
  if (!saveProgress(storage, state)) { notice('La sauvegarde a échoué. Tes changements sont temporaires : exporte une sauvegarde avant de quitter.'); return false; }
  $('#storageNotice').hidden = true;
  return true;
}
function progressBar(value, max, label) {
  return `<div class="progress" role="progressbar" aria-label="${escape(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}"><span style="width:${Math.min(100, value / max * 100)}%"></span></div>`;
}
const quests = [
  { id: 'reading', icon: '📖', title: 'Lecture en français — 15 minutes', description: 'Le récit « Le message effacé », un livre ou une ressource Alloprof.', label: 'Ma lecture est terminée' },
  { id: 'homework', icon: '✏️', title: 'Mes devoirs du jour', description: 'Je termine mes devoirs et je demande de l’aide au besoin.', label: 'Mes devoirs sont terminés' },
];
function renderQuests() {
  let count = 0;
  $('#questList').innerHTML = quests.map(quest => {
    const record = questRecord(state, today, quest.id), reward = SETTINGS.quests[quest.id];
    if (record.complete) count++;
    return `<div class="quest ${record.complete ? 'complete' : ''}"><span class="quest-icon">${quest.icon}</span><div class="quest-info"><h3>${quest.title}</h3><p>${quest.description}</p>${quest.id === 'reading' ? '<a class="story-link" href="#reading">Lire le récit et répondre aux questions ↓</a>' : ''}<div class="quest-rewards"><span>✦ +${reward.xp} XP</span><span>🪙 +${reward.coins} pièces</span></div><label class="check-label"><input type="checkbox" data-quest="${quest.id}" ${record.complete ? 'checked' : ''}><span>${quest.label}</span></label>${record.awarded ? '<small class="already-earned">Récompense du jour déjà reçue · aucun double gain</small>' : ''}</div>${record.complete ? '<span class="complete-mark" aria-label="Terminée">✓</span>' : ''}</div>`;
  }).join('');
  $('#dailyCount').textContent = `${count}/2 terminées`;
}
function renderStats() {
  const stats = totals(state), reading = readingStats(state, today);
  $('#todayDate').textContent = formatter.format(today);
  $('#levelLabel').textContent = `Niveau ${stats.level} · Explorateur`;
  $('#xpLabel').textContent = `${stats.xp} XP au total`;
  $('#xpBar').innerHTML = progressBar(stats.levelXp, SETTINGS.xpPerLevel, 'Progression vers le prochain niveau');
  $('#nextLevel').textContent = `Encore ${SETTINGS.xpPerLevel - stats.levelXp} XP avant le niveau ${stats.level + 1}`;
  $('#coinBalance').textContent = stats.coins;
  $('#streakCount').textContent = reading.streak;
  $('#weekCount').textContent = `${reading.week}/7 jours`;
  $('#streakNote').textContent = reading.streak ? `🔥 ${reading.streak} jour${reading.streak > 1 ? 's' : ''} de lecture de suite. Continue à ton rythme !` : 'Une nouvelle série commence avec ta prochaine lecture. Tu peux le faire !';
  $('#weekCalendar').innerHTML = weekDays(today).map(date => {
    const key = localDateKey(date), complete = questRecord(state, date, 'reading').complete;
    return `<div class="week-day ${key === localDateKey(today) ? 'today' : ''} ${complete ? 'read' : ''}"><span>${date.toLocaleDateString('fr-CA', { weekday: 'short' }).replace('.', '')}</span><span class="day-circle" aria-label="${escape(formatter.format(date))} : ${complete ? 'lecture terminée' : 'lecture non cochée'}">${complete ? '✓' : date.getDate()}</span>${key === localDateKey(today) ? '<span class="today-dot" aria-label="Aujourd’hui"></span>' : ''}</div>`;
  }).join('');
  $('#rewardList').innerHTML = SETTINGS.rewards.map(reward => {
    const owned = state.redeemed.includes(reward.id), enough = stats.coins >= reward.cost;
    return `<div class="reward"><span class="reward-art">${reward.icon}</span><div class="reward-info"><h3>${reward.name}</h3><span class="tiny">${owned ? 'Dans ta collection ✨' : `${Math.min(stats.coins, reward.cost)} / ${reward.cost} pièces`}</span>${progressBar(owned ? reward.cost : Math.max(0, stats.coins), reward.cost, reward.name)}<button data-reward="${reward.id}" ${owned || !enough ? 'disabled' : ''}>${owned ? 'Débloqué ✓' : enough ? 'Débloquer' : `Encore ${reward.cost - stats.coins} pièces`}</button></div></div>`;
  }).join('');
}
function renderCalendar() {
  const year = shownMonth.getFullYear(), month = shownMonth.getMonth(), leading = (shownMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  $('#monthLabel').textContent = shownMonth.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  $('#monthCalendar').innerHTML = weekdays.map(d => `<div class="calendar-heading">${d}</div>`).join('') + Array.from({ length: leading }, () => '<div aria-hidden="true"></div>').join('') + Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1, 12), key = localDateKey(date), reading = questRecord(state, date, 'reading').complete, homework = questRecord(state, date, 'homework').complete;
    return `<button class="calendar-day ${key === localDateKey(today) ? 'today' : ''} ${reading ? 'read' : ''} ${key === selectedDate ? 'selected' : ''}" data-date="${key}" aria-pressed="${key === selectedDate}" aria-label="${escape(formatter.format(date))} : lecture ${reading ? 'terminée' : 'non cochée'}, devoirs ${homework ? 'terminés' : 'non cochés'}" ${key === localDateKey(today) ? 'aria-current="date"' : ''}><span>${i + 1}</span><small aria-hidden="true">${reading ? '📖' : ''}${homework ? '✏️' : ''}</small></button>`;
  }).join('');
  const date = dateFromKey(selectedDate);
  $('#selectedDay').textContent = `${formatter.format(date)} · Lecture : ${questRecord(state, date, 'reading').complete ? 'terminée' : 'non cochée'} · Devoirs : ${questRecord(state, date, 'homework').complete ? 'terminés' : 'non cochés'}`;
}
let readingPanel, writingPanel, coachPanel, practicePanel, punctuationPanel;
function render() { renderQuests(); renderStats(); renderCalendar(); readingPanel?.refresh(); writingPanel?.refresh(); practicePanel?.refresh(); punctuationPanel?.refresh(); }
function checkRollover() {
  const now = new Date();
  if (localDateKey(now) === localDateKey(today)) return;
  today = now; selectedDate = localDateKey(now); shownMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  render(); notify('Un nouveau jour, une nouvelle aventure ! Tes efforts précédents sont conservés.');
}
$('#questList').addEventListener('change', event => {
  const input = event.target.closest('[data-quest]'); if (!input) return;
  const id = input.dataset.quest, checked = input.checked;
  // Check the clock at the action boundary, even if a sleeping phone missed the timer.
  checkRollover();
  const alreadyAwarded = questRecord(state, today, id).awarded;
  const saved = persist(setQuest(state, today, id, checked)); render();
  const focus = $(`[data-quest="${id}"]`); focus?.focus({ preventScroll: true });
  if (checked && !alreadyAwarded) notify(`Bravo Lionel ! +${SETTINGS.quests[id].xp} XP et +${SETTINGS.quests[id].coins} pièces${saved ? '.' : ' (sauvegarde indisponible).'}`);
  else if (checked) notify('Mission cochée. La récompense a déjà été reçue aujourd’hui.');
  else notify('Mission décochée. Les gains déjà reçus sont conservés, sans possibilité de les gagner deux fois.');
});
$('#rewardList').addEventListener('click', event => {
  const button = event.target.closest('[data-reward]'); if (!button) return;
  const next = redeemReward(state, button.dataset.reward); if (next === state) return;
  persist(next); renderStats(); $(`[data-reward="${button.dataset.reward}"]`)?.focus(); notify('Un nouveau trésor pour ton coin lecture !');
});
$('#monthCalendar').addEventListener('click', event => { const button = event.target.closest('[data-date]'); if (!button) return; selectedDate = button.dataset.date; renderCalendar(); $(`[data-date="${selectedDate}"]`)?.focus({ preventScroll: true }); });
for (const [selector, offset] of [['#previousMonth', -1], ['#nextMonth', 1]]) $(selector).addEventListener('click', () => { shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + offset, 1, 12); selectedDate = localDateKey(shownMonth); renderCalendar(); });
$('#exportProgress').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `lionel-mission-lecture-${localDateKey(new Date())}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#importProgress').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw Error('Sauvegarde trop volumineuse');
    const next = sanitizeProgress(JSON.parse(await file.text()));
    if (!confirm('Remplacer la progression de cet appareil par cette sauvegarde ? Exporte d’abord ta progression actuelle si tu souhaites la conserver.')) return;
    preserveBrokenSave = false; const saved = persist(next); render(); notify(saved ? 'Ta progression a été restaurée.' : 'Progression chargée, mais la sauvegarde reste indisponible. Exporte-la avant de quitter.');
  } catch { notify('Cette sauvegarde est invalide. Ta progression n’a pas été modifiée.'); }
  finally { event.target.value = ''; }
});
window.addEventListener('focus', checkRollover);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRollover(); });
setInterval(checkRollover, 30_000);
// Keep multiple open tabs consistent without accumulating duplicate balances.
window.addEventListener('storage', event => {
  if (event.key !== 'mission-lecture-lionel-v1') return;
  const fresh = loadProgress(storage);
  if (fresh.error) { notice(fresh.error); return; }
  state = fresh.state; render(); notify('Progression mise à jour depuis un autre onglet.');
});
coachPanel = createCoach($('#coach'));
practicePanel = createPractice($('#practice'), { getWorkbook: () => state.workbook, saveWorkbook: workbook => persist({ ...state, workbook }), explain: id => coachPanel.explain(id) });
punctuationPanel = createPunctuationPanel($('#punctuation'), { getWorkbook: () => state.workbook, saveWorkbook: workbook => persist({ ...state, workbook }), explain: id => coachPanel.explain(id) });
writingPanel = createWritingPanel($('#writing'), { getWorkbook: () => state.workbook, saveWorkbook: workbook => persist({ ...state, workbook }) });
readingPanel = createReadingPanel($('#reading'), { getWorkbook: () => state.workbook, saveWorkbook: workbook => persist({ ...state, workbook }), notify, explain: id => coachPanel.explain(id) });
render();
