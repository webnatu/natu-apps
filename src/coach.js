import { VIDEO_CAPSULES } from './media/capsules.js';
export const CAPSULES = VIDEO_CAPSULES.map(c => ({ id: c.id, title: c.title, steps: c.scenes.map(scene => scene.narration) }));

export const PRACTICE = [
  { id: 'p1', topic: 'emotion', question: 'Au début, Lionel efface sa réponse et tire sur sa manche. Quelle émotion ces indices peuvent-ils suggérer ?', options: ['De l’inquiétude', 'Une grande satisfaction', 'De l’indifférence'], correct: 0, explanation: 'Ces gestes d’hésitation et de tension soutiennent l’idée qu’il est inquiet. On justifie une émotion par les gestes et le contexte, pas seulement par un mot choisi au hasard.' },
  { id: 'p2', topic: 'inference', question: 'Laquelle de ces propositions est une inférence plutôt qu’un fait explicitement raconté ?', options: ['Sami apporte deux bouteilles d’eau.', 'Lionel pourrait avoir peur du jugement des autres.', 'La cloche sonne.'], correct: 1, explanation: 'Le récit raconte directement les bouteilles et la cloche. La peur du jugement est une interprétation : on la déduit de son regard évité et de son attente avant de parler.' },
  { id: 'p3', topic: 'evidence', question: 'Quelle réponse explique le mieux l’évolution de Lionel ?', options: ['Il change parce que c’est la fin.', 'Il est courageux. Voilà.', 'Il passe de l’évitement à la recherche d’une solution : il avoue son erreur, puis ouvre l’ancienne version pour travailler avec Sami.'], correct: 2, explanation: 'La troisième réponse présente un changement et des actions précises du récit. Elle relie l’idée aux indices. Les deux autres réponses ne justifient pas leur interprétation.' }
];
export function evaluatePractice(id, choice) {
  const item = PRACTICE.find(p => p.id === id);
  if (!item || !Number.isInteger(choice) || choice < 0 || choice >= item.options.length) return null;
  return { correct: choice === item.correct, explanation: item.explanation, topic: item.topic };
}
export function createCoach(root) {
  let topic = CAPSULES[0], step = 0, speech;
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">DES CAPSULES POUR COMPRENDRE</p><h2 id="coachTitle">Milo, mon guide de lecture</h2></div><span class="counter">Sans pression</span></div><p class="caption">De vraies vidéos avec démonstrations visuelles, narration française intégrée et sous-titres. Appuie sur Lecture; tu peux mettre en pause et revoir chaque passage. La voix est synthétique. L’audio ne dépend pas des voix installées sur ton appareil.</p><label class="writing-label" for="capsuleTopic">J’aimerais comprendre…</label><select id="capsuleTopic">${CAPSULES.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}</select><video id="capsuleVideo" controls playsinline preload="metadata" aria-label="Capsule vidéo avec Milo"><source id="capsuleVideoSource" type="video/mp4"><track id="capsuleCaptions" kind="captions" srclang="fr" label="Français" default>Ton navigateur ne peut pas lire cette vidéo.</video><p class="tiny"><a id="capsuleVideoDownload" download>Télécharger la vidéo</a> · Les sous-titres peuvent être activés avec le bouton CC.</p><details class="capsule-transcript"><summary>Lire la transcription ou revoir une étape</summary><div class="coach-scene"><div class="coach-avatar" role="img" aria-label="Milo, guide illustré"><span class="coach-hair"></span><span class="coach-face"><i class="eye left"></i><i class="eye right"></i><i class="coach-mouth"></i></span><span class="coach-shirt">M</span></div><div class="coach-bubble"><strong id="capsuleHeading"></strong><p id="capsuleText" aria-live="polite"></p></div></div><div class="question-nav"><button id="capsulePrevious">← Revoir</button><span id="capsuleStep"></span><button id="capsuleNext">Suite →</button></div><div class="draft-tools"><button id="capsuleListen">Écouter cette étape</button><button id="capsuleStop" disabled>Arrêter</button></div><p id="capsuleAudioStatus" class="tiny" role="status">La transcription et l’audio de secours restent disponibles ci-dessus.</p></details>`;
  const select = root.querySelector('#capsuleTopic'), listen = root.querySelector('#capsuleListen'), stop = root.querySelector('#capsuleStop'), status = root.querySelector('#capsuleAudioStatus');
  const video = root.querySelector('#capsuleVideo');
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  function stopAudio() { if (speech) { speech.onend = null; speech.onerror = null; speechSynthesis.cancel(); speech = null; } root.classList.remove('coach-speaking'); stop.disabled = true; listen.disabled = !supported; }
  function render() { stopAudio(); select.value = topic.id; if (video.dataset.topic !== topic.id) { video.pause(); video.dataset.topic = topic.id; root.querySelector('#capsuleVideoSource').src = `src/media/${topic.id}.mp4`; root.querySelector('#capsuleCaptions').src = `src/media/${topic.id}.fr.vtt`; video.poster = `src/media/${topic.id}-poster.jpg`; root.querySelector('#capsuleVideoDownload').href = `src/media/${topic.id}.mp4`; video.load(); } root.querySelector('#capsuleHeading').textContent = topic.title; root.querySelector('#capsuleText').textContent = topic.steps[step]; root.querySelector('#capsuleStep').textContent = `${step + 1} / ${topic.steps.length}`; root.querySelector('#capsulePrevious').disabled = step === 0; root.querySelector('#capsuleNext').disabled = step === topic.steps.length - 1; }
  select.onchange = () => { topic = CAPSULES.find(c => c.id === select.value); step = 0; render(); };
  root.querySelector('#capsulePrevious').onclick = () => { step--; render(); };
  root.querySelector('#capsuleNext').onclick = () => { step++; render(); };
  if (!supported) status.textContent = 'Audio indisponible dans ce navigateur. Toutes les explications restent lisibles.';
  else listen.onclick = () => {
    video.pause(); stopAudio(); speechSynthesis.cancel(); speech = new SpeechSynthesisUtterance(topic.steps[step]); speech.lang = 'fr-CA'; speech.rate = 0.88;
    const voices = speechSynthesis.getVoices(), voice = voices.find(v => v.lang.toLowerCase() === 'fr-ca') || voices.find(v => v.lang.toLowerCase().startsWith('fr')); if (voice) speech.voice = voice;
    const finish = message => { speech = null; root.classList.remove('coach-speaking'); stop.disabled = true; listen.disabled = false; status.textContent = message; };
    speech.onend = () => finish('Étape terminée. Tu peux la réécouter ou passer à la suite.'); speech.onerror = () => finish('La voix a été interrompue ou n’est pas disponible. Relis l’explication ci-dessus.');
    speechSynthesis.speak(speech); root.classList.add('coach-speaking'); listen.disabled = true; stop.disabled = false; status.textContent = 'Milo explique cette étape. Les voix disponibles dépendent de ton appareil.';
  };
  video.addEventListener('play', stopAudio);
  stop.onclick = () => { stopAudio(); status.textContent = 'Explication audio arrêtée.'; }; window.addEventListener('pagehide', () => { stopAudio(); video.pause(); }); render();
  return { explain(id) { topic = CAPSULES.find(c => c.id === id) || CAPSULES[2]; step = 0; render(); root.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); select.focus({ preventScroll: true }); } };
}
export function createPractice(root, { getWorkbook, saveWorkbook, explain }) {
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">JE M’ENTRAÎNE, PUIS JE RÉESSAIE</p><h2 id="practiceTitle">Petits défis de compréhension</h2></div></div><p class="caption">Ces exercices portent sur le récit ci-dessus. Une erreur sert à comprendre; elle ne retire aucun point. Les questions d’interprétation ouvertes restent dans ton carnet.</p>${PRACTICE.map(p => `<fieldset class="practice-item"><legend>${p.question}</legend>${p.options.map((option, i) => `<label><input type="radio" name="${p.id}" value="${i}">${option}</label>`).join('')}<button data-practice="${p.id}">Vérifier ma réponse</button><p id="feedback-${p.id}" class="practice-feedback" role="status"></p><button data-practice-help="${p.topic}" class="help-button">Milo, explique-moi</button></fieldset>`).join('')}`;
  root.addEventListener('click', event => {
    const help = event.target.closest('[data-practice-help]'); if (help) { explain(help.dataset.practiceHelp); return; }
    const button = event.target.closest('[data-practice]'); if (!button) return;
    const id = button.dataset.practice, input = root.querySelector(`input[name="${id}"]:checked`), feedback = root.querySelector(`#feedback-${id}`);
    if (!input) { feedback.textContent = 'Choisis une réponse, puis vérifie-la. Tu peux aussi demander une explication à Milo.'; return; }
    const result = evaluatePractice(id, Number(input.value));
    const saved = saveWorkbook({ ...getWorkbook(), practiceAnswers: { ...getWorkbook().practiceAnswers, [id]: Number(input.value) } });
    feedback.textContent = `${result.correct ? 'Oui, cette réponse est appuyée par le texte.' : 'Reprenons les indices ensemble.'} ${result.explanation}${saved ? '' : ' Sauvegarde indisponible : exporte ta progression.'}`;
  });
  return { refresh() { for (const p of PRACTICE) { const choice = getWorkbook().practiceAnswers?.[p.id]; for (const input of root.querySelectorAll(`input[name="${p.id}"]`)) input.checked = String(choice) === input.value; const result = evaluatePractice(p.id, choice); root.querySelector(`#feedback-${p.id}`).textContent = result ? `${result.correct ? 'Réponse appuyée par le texte.' : 'À revoir ensemble.'} ${result.explanation}` : ''; } } };
}
