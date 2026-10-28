export const WRITING_EXERCISES = [
  { id: 'w1', title: 'Le journal de Lionel', prompt: 'Écris une entrée du journal de Lionel après la présentation. Fais comprendre une émotion, ce qui l’a provoquée et ce qu’il a appris. Tu peux commencer par quelques phrases, puis enrichir ton texte.', plan: '1. Ce qui s’est passé. 2. Ce que j’ai ressenti et pourquoi. 3. Ce que je ferai autrement.' },
  { id: 'w2', title: 'Le point de vue de Sami', prompt: 'Raconte la scène du corridor du point de vue de Sami, en utilisant « je ». Garde les événements du récit, mais imagine ses pensées. Distingue ce que Sami sait de ce qu’il suppose.', plan: 'Je remarque… Je me demande… Quand Lionel m’avoue… Je décide de…' },
  { id: 'w3', title: 'Un paragraphe d’interprétation', prompt: 'Lionel fait-il preuve de courage en avouant son erreur ? Prends position. Appuie ton idée sur un passage du texte et explique le lien. Tu peux ne pas être d’accord si tu justifies ta réponse.', plan: 'Mon idée → un indice ou une courte citation → mon explication → ma conclusion.' },
];
export function basicRevision(text) {
  const notes = [];
  if (/\b([\p{L}]+)\s+\1\b/iu.test(text)) notes.push('Un mot semble répété deux fois de suite. Vérifie si c’est volontaire.');
  if (text.trim() && /^\p{Ll}/u.test(text.trim())) notes.push('Le début du texte commence par une minuscule. Vérifie la majuscule.');
  if (text.trim() && !/[.!?…»”)]$/u.test(text.trim())) notes.push('Vérifie le signe de ponctuation à la fin de ton texte.');
  return notes;
}
export async function checkFrench(text, { fetcher = fetch, signal } = {}) {
  if (!text.trim() || text.length > 4000) throw Error('Écris de 1 à 4 000 caractères pour lancer cette vérification.');
  const response = await fetcher('https://api.languagetool.org/v2/check', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'fr' }), signal,
  });
  if (!response.ok) throw Error(response.status === 429 ? 'Le service reçoit trop de demandes. Réessaie plus tard.' : 'Le service de correction est indisponible. Utilise la révision guidée en attendant.');
  const data = await response.json();
  if (!Array.isArray(data.matches)) throw Error('Le service a renvoyé une réponse inattendue.');
  return data.matches.filter(m => Number.isInteger(m.offset) && Number.isInteger(m.length) && m.offset >= 0 && m.length >= 0 && m.offset + m.length <= text.length).map(m => ({
    excerpt: text.slice(m.offset, m.offset + m.length), message: String(m.message || 'Passage à vérifier'),
    replacements: Array.isArray(m.replacements) ? m.replacements.slice(0, 4).map(r => String(r.value ?? '')) : [],
  }));
}
export function createWritingPanel(root, { getWorkbook, saveWorkbook }) {
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">ÉCRIRE POUR MIEUX COMPRENDRE</p><h2 id="writingTitle">Mon atelier d’écriture</h2></div></div><p class="caption">Choisis un exercice. Prépare tes idées à voix haute, écris un brouillon, puis révise une chose à la fois. Tu n’as pas à tout réussir du premier coup.</p><label class="writing-label" for="writingExercise">Mon exercice</label><select id="writingExercise">${WRITING_EXERCISES.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}</select><h3 id="writingPrompt"></h3><p id="writingPlan" class="answer-scaffold"></p><label class="writing-label" for="writingDraft">Mon brouillon</label><textarea id="writingDraft" rows="9" maxlength="4000" spellcheck="true" lang="fr-CA" aria-describedby="writingHelp"></textarea><p class="tiny" id="writingHelp">Le soulignement orthographique dépend de ton navigateur et de ses dictionnaires. Les variantes du français québécois peuvent être signalées à tort.</p><p id="writingCount" class="tiny"></p><p id="writingSaveStatus" class="tiny" role="status"></p><div class="draft-tools"><button id="listenDraft">Écouter mon brouillon</button><button id="stopDraft" disabled>Arrêter l’audio</button><button id="localRevision">Ma révision guidée</button></div><p id="draftAudioStatus" class="tiny" role="status"></p><div id="localRevisionResults" class="revision-results" role="status"></div><details class="revision-checklist"><summary>Ma liste de révision, une étape à la fois</summary><ol><li>Le sens : est-ce que j’ai répondu à la question ?</li><li>Les idées : ai-je un indice et une explication ?</li><li>Les phrases : je relis à voix haute et je vérifie la ponctuation.</li><li>Les accords : je repère le sujet et son verbe, puis les noms et leurs adjectifs.</li><li>Les mots : je vérifie quelques mots à la fois avec les outils disponibles.</li></ol></details><div class="external-check"><h3>Aide à l’orthographe et à la grammaire</h3><p>LanguageTool propose des pistes, sans garantir de trouver toutes les erreurs. Le service utilise le français général et peut mal reconnaître un usage québécois. Aucune note n’est attribuée.</p><label class="external-consent"><input type="checkbox" id="checkerConsent"> J’accepte d’envoyer uniquement ce brouillon au service externe LanguageTool pour cette vérification.</label><p class="tiny">Le texte quitte cet appareil. Évite les noms complets, coordonnées ou renseignements personnels. Lis la <a href="https://languagetool.org/legal/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité ↗</a> avec un adulte. L’audio utilise les voix de ton appareil; certaines voix peuvent aussi nécessiter Internet.</p><button id="checkGrammar" disabled>Vérifier ce brouillon</button><p id="grammarStatus" role="status"></p><div id="grammarResults"></div></div>`;
  const draft = root.querySelector('#writingDraft'), select = root.querySelector('#writingExercise'), consent = root.querySelector('#checkerConsent'), check = root.querySelector('#checkGrammar');
  const status = root.querySelector('#grammarStatus'), results = root.querySelector('#grammarResults');
  let active = getWorkbook().selectedWriting || 'w1', pending, speech;
  function updateCount() { root.querySelector('#writingCount').textContent = `${draft.value.trim() ? draft.value.trim().split(/\s+/u).length : 0} mots · ${draft.value.length}/4 000 caractères`; }
  function invalidate() { pending?.abort(); pending = null; results.replaceChildren(); status.textContent = ''; check.disabled = !consent.checked; }
  function stopAudio() { if (speech) { speech.onend = null; speech.onerror = null; window.speechSynthesis?.cancel(); speech = null; } root.querySelector('#listenDraft').disabled = !('speechSynthesis' in window); root.querySelector('#stopDraft').disabled = true; }
  function refresh() {
    const workbook = getWorkbook(); active = WRITING_EXERCISES.some(e => e.id === workbook.selectedWriting) ? workbook.selectedWriting : 'w1'; select.value = active;
    const exercise = WRITING_EXERCISES.find(e => e.id === active); root.querySelector('#writingPrompt').textContent = exercise.prompt; root.querySelector('#writingPlan').textContent = exercise.plan;
    draft.value = workbook.writings?.[active] || ''; updateCount();
  }
  select.onchange = () => { stopAudio(); invalidate(); consent.checked = false; check.disabled = true; active = select.value; saveWorkbook({ ...getWorkbook(), selectedWriting: active }); refresh(); };
  draft.addEventListener('input', () => { stopAudio(); invalidate(); consent.checked = false; check.disabled = true; updateCount(); const workbook = getWorkbook(); const saved = saveWorkbook({ ...workbook, writings: { ...workbook.writings, [active]: draft.value } }); root.querySelector('#writingSaveStatus').textContent = saved ? 'Brouillon enregistré sur cet appareil.' : 'Sauvegarde indisponible : exporte ta progression avant de quitter.'; });
  root.querySelector('#localRevision').onclick = () => {
    const target = root.querySelector('#localRevisionResults'); target.replaceChildren();
    const notes = basicRevision(draft.value);
    for (const message of notes.length ? notes : ['Commence par vérifier ton idée, ton indice et ton explication. Cette aide locale repère seulement quelques points simples; elle ne corrige pas toute la langue.']) { const p = document.createElement('p'); p.textContent = message; target.append(p); }
  };
  const listen = root.querySelector('#listenDraft'), stop = root.querySelector('#stopDraft'), audioStatus = root.querySelector('#draftAudioStatus');
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { listen.disabled = true; audioStatus.textContent = 'Lecture audio non disponible dans ce navigateur.'; }
  else listen.onclick = () => {
    if (!draft.value.trim()) { audioStatus.textContent = 'Écris d’abord une phrase à écouter.'; return; }
    stopAudio(); speech = new SpeechSynthesisUtterance(draft.value); speech.lang = 'fr-CA'; speech.rate = 0.88;
    const voices = speechSynthesis.getVoices(), voice = voices.find(v => v.lang.toLowerCase() === 'fr-ca') || voices.find(v => v.lang.toLowerCase().startsWith('fr')); if (voice) speech.voice = voice;
    speech.onend = () => { speech = null; listen.disabled = false; stop.disabled = true; audioStatus.textContent = 'Lecture terminée.'; };
    speech.onerror = () => { speech = null; listen.disabled = false; stop.disabled = true; audioStatus.textContent = 'La voix a été interrompue ou n’est pas disponible.'; };
    speechSynthesis.speak(speech); listen.disabled = true; stop.disabled = false; audioStatus.textContent = 'Lecture du brouillon en cours.';
  };
  stop.onclick = () => { stopAudio(); audioStatus.textContent = 'Lecture arrêtée.'; }; window.addEventListener('pagehide', stopAudio);
  consent.onchange = () => { if (!consent.checked) invalidate(); check.disabled = !consent.checked; };
  check.onclick = async () => {
    if (!consent.checked) return;
    const text = draft.value; if (!text.trim()) { status.textContent = 'Écris d’abord ton brouillon.'; return; }
    const controller = new AbortController(); pending?.abort(); pending = controller; check.disabled = true; results.replaceChildren(); status.textContent = 'Vérification en cours…';
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const matches = await checkFrench(text, { signal: controller.signal });
      if (pending !== controller || draft.value !== text) return;
      status.textContent = matches.length ? `${matches.length} passage(s) à examiner. Les propositions sont des pistes à vérifier.` : 'Aucune suggestion reçue. Cela ne garantit pas un texte sans erreur.';
      for (const match of matches) { const item = document.createElement('div'); item.className = 'grammar-item'; const title = document.createElement('strong'); title.textContent = match.excerpt ? `Dans « ${match.excerpt} »` : 'À cet endroit du texte'; const message = document.createElement('p'); message.textContent = match.message; item.append(title, message); if (match.replacements.length) { const p = document.createElement('p'); p.textContent = `Propositions : ${match.replacements.join(' / ')}`; item.append(p); } results.append(item); }
    } catch (error) { if (pending === controller) status.textContent = error.name === 'AbortError' ? 'Vérification interrompue ou trop longue. Réessaie plus tard; ton brouillon reste sauvegardé.' : error.message; }
    finally { clearTimeout(timeout); if (pending === controller) { pending = null; consent.checked = false; check.disabled = true; } }
  };
  refresh(); return { refresh: () => { invalidate(); refresh(); } };
}
