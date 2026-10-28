export const STORY = [
  { title: '1 — Avant la présentation', paragraphs: [
    'Lionel regarde son téléphone pour la quatrième fois. Son équipe doit présenter son projet dans dix minutes.',
    'Un message de Sami apparaît :', '« Tu as bien la version finale ? »', 'Lionel écrit « Oui », puis efface sa réponse.',
    'La veille, il a modifié la conclusion sans prévenir son ami. Il voulait rendre le projet plus intéressant. Mais ce matin, en relisant son texte, il a découvert une erreur importante.',
    'Il pourrait remettre l’ancienne version. Pourtant, son doigt reste immobile au-dessus de l’écran.'
  ] },
  { title: '2 — Dans le corridor', paragraphs: [
    'Sami arrive avec deux bouteilles d’eau.', '— Tiens. Tu es prêt ?', '— Presque.',
    'Lionel range rapidement son téléphone. Il tire sur la manche de son chandail.', '— Tu as changé quelque chose ? demande Sami.', '— Pourquoi tu dis ça ?',
    'Sa réponse sort plus sèchement qu’il ne le voulait.', 'Sami baisse les yeux vers ses notes.', '— Comme ça. Tu ne me regardes pas.',
    'Lionel voudrait expliquer. Mais deux élèves passent près d’eux en parlant de leur propre présentation.', 'Il attend qu’ils s’éloignent.'
  ] },
  { title: '3 — Le choix', paragraphs: [
    '— J’ai changé la conclusion, dit-il enfin. Et je pense que j’ai mélangé deux informations.', 'Sami ne répond pas tout de suite.', '— Tu aurais pu me le dire hier.',
    'Lionel fixe une marque sur le plancher.', '— Je voulais que notre projet soit meilleur.', '— Notre projet, répète Sami. On était deux.',
    'La cloche sonne.', 'Lionel sort son téléphone et ouvre l’ancienne version.', '— On peut reprendre celle-ci. Après, je t’expliquerai ce que je voulais ajouter.',
    'Sami rapproche sa chaise.', '— Montre-moi d’abord l’erreur. On a peut-être le temps de la corriger.',
    'Pour la première fois de la matinée, Lionel laisse échapper un petit rire. Ses épaules se détendent.',
    'Le projet n’est pas encore réparé. Mais il n’est plus seul devant le problème.'
  ] }
];
export const QUESTIONS = [
  { id: 'q1', topic: 'Émotion', prompt: 'Au début, comment Lionel se sent-il ? Relève un geste ou une phrase pour appuyer ta réponse.', scaffold: 'Lionel semble… L’indice dans le texte est… Cet indice montre que…', guide: 'Il peut sembler inquiet, nerveux ou mal à l’aise. Il regarde son téléphone quatre fois et efface sa réponse. Explique comment ces gestes traduisent son hésitation.' },
  { id: 'q2', topic: 'Motivation', prompt: 'Pourquoi Lionel a-t-il changé la conclusion ? Explique ce qu’il voulait obtenir.', scaffold: 'Il a modifié la conclusion parce qu’il voulait… Le texte précise que…', guide: 'Il voulait rendre le projet plus intéressant ou meilleur. Distingue son intention (améliorer le projet) du résultat (une erreur et un conflit).' },
  { id: 'q3', topic: 'Inférence', prompt: 'Pourquoi hésite-t-il à dire la vérité ? Propose une explication avec un indice du texte.', scaffold: 'Je pense qu’il craint… Mon indice est… Je fais ce lien parce que…', guide: 'Il pourrait craindre la réaction de Sami, le jugement des autres ou de décevoir son ami. Il évite le regard de Sami et attend que les deux élèves s’éloignent. Plusieurs interprétations sont possibles si elles sont justifiées.' },
  { id: 'q4', topic: 'Valeur et psychologie', prompt: 'Que ressent Sami lorsqu’il dit : « On était deux » ? Qu’est-ce qui est important pour lui dans un travail d’équipe ?', scaffold: 'Sami pourrait ressentir… Il semble accorder de l’importance à… L’expression… le montre parce que…', guide: 'Sami peut être déçu ou frustré de ne pas avoir été consulté. Le mot « notre » et « On était deux » suggèrent qu’il valorise la collaboration ou le respect. Une émotion est passagère; une valeur est ce qui compte pour la personne.' },
  { id: 'q5', topic: 'Évolution et trait de caractère', prompt: 'Comment Lionel change-t-il entre le début et la fin ? Quel trait de caractère sa décision de dire la vérité peut-elle révéler ?', scaffold: 'Au début, il… À la fin, il… Le changement se produit parce que… Sa décision peut montrer qu’il est… puisque…', guide: 'Au début, il évite le problème et semble tendu. À la fin, il avoue son erreur et accepte de chercher une solution avec Sami; ses épaules se détendent. On peut parler d’honnêteté ou de courage en justifiant avec son aveu. Un trait est une façon d’être; une émotion est un état ressenti à un moment donné.' }
];
export function defaultWorkbook() { return { answers: {}, writings: {}, practiceAnswers: {}, selectedWriting: 'w1', fontSize: 20, wideSpacing: true }; }
export function sanitizeWorkbook(value) {
  const result = defaultWorkbook();
  if (!value || typeof value !== 'object') return result;
  for (const id of ['p1', 'p2', 'p3']) if (Number.isInteger(value.practiceAnswers?.[id]) && value.practiceAnswers[id] >= 0 && value.practiceAnswers[id] <= 2) result.practiceAnswers[id] = value.practiceAnswers[id];
  if (['w1', 'w2', 'w3'].includes(value.selectedWriting)) result.selectedWriting = value.selectedWriting;
  for (const id of ['w1', 'w2', 'w3']) if (typeof value.writings?.[id] === 'string') result.writings[id] = value.writings[id].slice(0, 4000);
  if ([18, 20, 24, 28].includes(value.fontSize)) result.fontSize = value.fontSize;
  if (typeof value.wideSpacing === 'boolean') result.wideSpacing = value.wideSpacing;
  for (const { id } of QUESTIONS) if (typeof value.answers?.[id] === 'string') result.answers[id] = value.answers[id].slice(0, 2000);
  return result;
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function createReadingPanel(root, { getWorkbook, saveWorkbook, notify, explain }) {
  let activeQuestion = 0, currentSpeech = null;
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">FRANÇAIS · QUÉBEC · 2e SECONDAIRE</p><h2 id="readingTitle">Le message effacé</h2></div><span class="counter">Récit original</span></div>
    <p class="caption">Lis à ton rythme, par petites sections. Tu peux répondre à voix haute avant d’écrire. Tu n’as pas à terminer le texte en 15 minutes.</p>
    <div class="reading-tools" aria-label="Confort de lecture"><label>Taille du texte <select id="readingSize"><option value="18">18 px</option><option value="20">20 px</option><option value="24">24 px</option><option value="28">28 px</option></select></label><label><input type="checkbox" id="readingSpacing"> Espacement aéré</label><div class="speech-buttons"><button id="readAloud">Écouter le récit</button><button id="stopReading" disabled>Arrêter</button></div></div>
    <p class="tiny" id="speechStatus" role="status">La lecture audio dépend des voix de ton appareil; certaines voix nécessitent Internet.</p>
    <details class="reading-strategies"><summary>Mes stratégies de lecture</summary><ol><li><strong>Avant :</strong> je lis le titre et les questions. Je prédis le sujet sans chercher la bonne réponse tout de suite.</li><li><strong>Par morceaux :</strong> je lis une section à la fois. Je peux utiliser une règle ou mon doigt pour suivre une ligne, si cela m’aide.</li><li><strong>Je fais une pause :</strong> je résume le passage en une phrase, à voix haute ou par écrit.</li><li><strong>Je repère :</strong> qui agit, ce qu’il fait, dit ou pense. Je distingue ce qui est écrit de ce que je déduis.</li><li><strong>Si je bloque :</strong> je relis la phrase, je cherche le sens avec le contexte, puis je demande de l’aide au besoin.</li><li><strong>Je justifie :</strong> mon idée → un indice du texte → une explication du lien.</li></ol><p>Essaie un outil à la fois et garde ce qui t’aide. Ces stratégies accompagnent les adaptations de ton école; elles ne les remplacent pas.</p></details><details class="reading-vocabulary"><summary>Avant de lire : quelques repères</summary><p><strong>Conclusion :</strong> dernière partie d’un travail. <strong>Corridor :</strong> passage entre les locaux. <strong>Inférence :</strong> idée que tu déduis à partir d’indices.</p><p><strong>Émotion :</strong> ce qu’on ressent à un moment précis. <strong>Trait de caractère :</strong> façon d’être. <strong>Valeur :</strong> ce qui compte pour une personne. <strong>Motivation :</strong> ce qui la pousse à agir.</p></details>
    <article class="story-text" aria-label="Le message effacé">${STORY.map(section => `<section><h3>${section.title}</h3>${section.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</section>`).join('')}</article>
    <div class="reading-finish"><a href="#quests" class="light-button">Retourner cocher ma mission ↑</a><p class="tiny">Écouter ou répondre ne coche pas automatiquement la mission et ne donne pas de points supplémentaires.</p></div>
    <section class="comprehension" aria-labelledby="comprehensionTitle"><p class="eyebrow">COMPRENDRE LES PERSONNAGES</p><h3 id="comprehensionTitle">Une idée → un indice → une explication</h3><p class="caption">Pas de note automatique. Plusieurs réponses sont possibles si tu les appuies sur le texte.</p><div class="question-nav"><button id="previousQuestion" aria-label="Question précédente">← Précédente</button><span id="questionNumber"></span><button id="nextQuestion" aria-label="Question suivante">Suivante →</button></div><div id="questionContent"></div><p class="tiny" id="answerStatus" role="status">Les réponses sont enregistrées sur cet appareil avec ta progression.</p></section>`;
  const size = root.querySelector('#readingSize'), spacing = root.querySelector('#readingSpacing'), text = root.querySelector('.story-text');
  function renderQuestion() {
    const q = QUESTIONS[activeQuestion];
    root.querySelector('#questionNumber').textContent = `${activeQuestion + 1} / ${QUESTIONS.length}`;
    root.querySelector('#previousQuestion').disabled = activeQuestion === 0;
    root.querySelector('#nextQuestion').disabled = activeQuestion === QUESTIONS.length - 1;
    root.querySelector('#questionContent').innerHTML = `<p class="question-topic">${q.topic}</p><label class="question-prompt" for="readingAnswer">${q.prompt}</label><p class="answer-scaffold" id="answerHelp">${q.scaffold}</p><textarea id="readingAnswer" maxlength="2000" rows="5" aria-describedby="answerHelp" placeholder="Écris ton idée, ton indice et ton explication…"></textarea><button type="button" id="questionHelp" class="help-button">Je ne comprends pas : Milo, explique-moi</button><details class="answer-guide"><summary>Voir une piste de réponse</summary><p>${q.guide}</p><small>Compare avec ton idée : as-tu un indice précis et une explication ?</small></details>`;
    root.querySelector('#questionHelp').onclick = () => explain(q.id === 'q1' || q.id === 'q4' ? 'emotion' : q.id === 'q3' ? 'inference' : 'evidence');
    const answer = root.querySelector('#readingAnswer'); answer.value = getWorkbook().answers[q.id] || '';
    answer.addEventListener('input', () => {
      const workbook = getWorkbook(); const saved = saveWorkbook({ ...workbook, answers: { ...workbook.answers, [q.id]: answer.value } });
      root.querySelector('#answerStatus').textContent = saved ? 'Réponse enregistrée sur cet appareil.' : 'Réponse temporaire : sauvegarde indisponible. Exporte ta progression avant de quitter.';
    });
  }
  for (const [id, direction] of [['#previousQuestion', -1], ['#nextQuestion', 1]]) root.querySelector(id).onclick = () => { activeQuestion += direction; renderQuestion(); root.querySelector('#readingAnswer').focus({ preventScroll: true }); };
  function refresh() {
    const workbook = getWorkbook(); size.value = String(workbook.fontSize); spacing.checked = workbook.wideSpacing;
    text.style.fontSize = `${workbook.fontSize}px`; text.classList.toggle('wide-spacing', workbook.wideSpacing);
    const answer = root.querySelector('#readingAnswer'); if (answer) answer.value = workbook.answers[QUESTIONS[activeQuestion].id] || '';
  }
  size.onchange = () => { saveWorkbook({ ...getWorkbook(), fontSize: Number(size.value) }); refresh(); };
  spacing.onchange = () => { saveWorkbook({ ...getWorkbook(), wideSpacing: spacing.checked }); refresh(); };
  const listen = root.querySelector('#readAloud'), stop = root.querySelector('#stopReading'), speechStatus = root.querySelector('#speechStatus');
  function stopSpeech() { if (currentSpeech) { currentSpeech.onend = null; currentSpeech.onerror = null; } if ('speechSynthesis' in window) window.speechSynthesis.cancel(); currentSpeech = null; stop.disabled = true; listen.disabled = false; }
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { listen.disabled = true; speechStatus.textContent = 'La lecture audio n’est pas disponible dans ce navigateur. Tu peux utiliser les outils de lecture de ton appareil.'; }
  else {
    listen.onclick = () => {
      stopSpeech(); currentSpeech = new SpeechSynthesisUtterance(`Le message effacé. ${STORY.map(s => `${s.title}. ${s.paragraphs.join(' ')}`).join(' ')}`);
      currentSpeech.lang = 'fr-CA'; currentSpeech.rate = 0.88;
      const voices = speechSynthesis.getVoices(); const voice = voices.find(v => v.lang.toLowerCase() === 'fr-ca') || voices.find(v => v.lang.toLowerCase().startsWith('fr'));
      if (voice) currentSpeech.voice = voice;
      currentSpeech.onend = () => { stop.disabled = true; listen.disabled = false; currentSpeech = null; speechStatus.textContent = 'Lecture terminée. Tu peux relire une section à ton rythme.'; };
      currentSpeech.onerror = () => { stop.disabled = true; listen.disabled = false; currentSpeech = null; speechStatus.textContent = 'La lecture audio a été interrompue ou n’est pas disponible. Le texte reste accessible.'; };
      speechSynthesis.speak(currentSpeech); stop.disabled = false; listen.disabled = true; speechStatus.textContent = 'Lecture en cours. Tu peux l’arrêter à tout moment.';
    };
    stop.onclick = () => { stopSpeech(); speechStatus.textContent = 'Lecture arrêtée.'; notify('Lecture audio arrêtée.'); };
    window.addEventListener('pagehide', stopSpeech);
  }
  renderQuestion(); refresh(); return { refresh };
}
