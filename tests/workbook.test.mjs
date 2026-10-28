import { evaluatePunctuation, PUNCTUATION_EXERCISES } from '../src/punctuation.js';
import { markedWords } from '../src/reading.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, sanitizeProgress, totals } from '../src/progress.js';
import { defaultWorkbook, sanitizeWorkbook, QUESTIONS } from '../src/reading.js';
import { basicRevision, checkFrench } from '../src/writing.js';
import { evaluatePractice } from '../src/coach.js';
test('old saves migrate with empty workbook without affecting balances', () => {
  const old = { version: 1, history: { '2026-10-28': { reading: { complete: true, awarded: true } } }, redeemed: [] };
  const state = sanitizeProgress(old); assert.deepEqual(state.workbook, defaultWorkbook()); assert.equal(totals(state).xp, 15);
});
test('answers, separate drafts, practice attempts and preferences round-trip in backup', () => {
  const state = emptyProgress(); state.workbook = { ...defaultWorkbook(), answers: { q1: 'Il semble inquiet.' }, writings: { w1: 'Mon journal.', w2: 'Sami raconte.' }, practiceAnswers: { p1: 0, p2: 2 }, selectedWriting: 'w2', fontSize: 28, wideSpacing: false };
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(state))).workbook, state.workbook);
});
test('workbook import bounds text lengths and ignores unknown IDs and invalid preferences', () => {
  const workbook = sanitizeWorkbook({ answers: { q1: 'a'.repeat(5000), unknown: 'not saved' }, writings: { w1: 'a'.repeat(9000) }, fontSize: 1000, wideSpacing: 'false', selectedWriting: 'unknown', practiceAnswers: { p1: 99, p2: 1 } });
  assert.equal(workbook.answers.q1.length, 2000); assert.equal(workbook.writings.w1.length, 4000); assert.equal(workbook.fontSize, 20); assert.equal(workbook.wideSpacing, true); assert.deepEqual(workbook.practiceAnswers, { p2: 1 }); assert.equal(workbook.answers.unknown, undefined);
});
test('guided reading addresses emotions, motivations, inference, values and evolution', () => {
  assert.equal(QUESTIONS.length, 5); assert.ok(QUESTIONS.every(q => q.guide && q.scaffold));
  assert.equal(evaluatePractice('p1', 0).correct, true); assert.equal(evaluatePractice('p1', 2).correct, false); assert.equal(evaluatePractice('p2', 1).correct, true); assert.equal(evaluatePractice('p3', 2).correct, true); assert.equal(evaluatePractice('unknown', 0), null); assert.equal(evaluatePractice('p1', -1), null);
});
test('local revision flags only limited basic checks without pretending to grade', () => {
  assert.equal(basicRevision('je je pense').length, 3); assert.deepEqual(basicRevision('Je pense à Sami.'), []);
});
test('French check submits only the chosen text and validates returned offsets', async () => {
  let request;
  const result = await checkFrench('Les enfant joue.', { fetcher: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ matches: [{ offset: 4, length: 6, message: 'Accord à vérifier', replacements: [{ value: 'enfants' }] }, { offset: 999, length: 8, message: 'Invalid' }] }) }; } });
  assert.equal(request.url, 'https://api.languagetool.org/v2/check'); assert.equal(request.options.body.get('language'), 'fr'); assert.equal(request.options.body.get('text'), 'Les enfant joue.'); assert.deepEqual([...request.options.body.keys()], ['text', 'language']); assert.deepEqual(result, [{ excerpt: 'enfant', message: 'Accord à vérifier', replacements: ['enfants'] }]);
});
test('French check rejects oversized text, rate limits and malformed responses', async () => {
  await assert.rejects(checkFrench('x'.repeat(4001)), /4 000/);
  await assert.rejects(checkFrench('Texte.', { fetcher: async () => ({ ok: false, status: 429 }) }), /trop de demandes/);
  await assert.rejects(checkFrench('Texte.', { fetcher: async () => ({ ok: true, json: async () => ({}) }) }), /inattendue/);
});

test('punctuation explanations distinguish intended meaning and allow retries', () => {
  for (const exercise of PUNCTUATION_EXERCISES) {
    const correct = evaluatePunctuation(exercise.id, exercise.correct);
    assert.equal(correct.correct, true); assert.ok(correct.model); assert.ok(correct.explanation.length > 70);
    assert.equal(evaluatePunctuation(exercise.id, (exercise.correct + 1) % 3).correct, false);
  }
  assert.equal(evaluatePunctuation('unknown', 0), null);
  assert.equal(evaluatePunctuation('pun1', -1), null);
  assert.equal(evaluatePunctuation('pun1', 100), null);
});
test('tracking preferences, punctuation attempts and written exercise round-trip', () => {
  const state = emptyProgress(); Object.assign(state.workbook, { wordMarkers: true, lineGuide: true, readingWord: 12, punctuationIndex: 2, punctuationAnswers: { pun1: { choice: 1, checked: true } }, punctuationDraft: 'Sami demande : « Tu es prêt ? »' });
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(state))).workbook, state.workbook);
  const old = sanitizeProgress({ version: 1, history: {}, redeemed: [] }); assert.equal(old.workbook.wordMarkers, false); assert.equal(old.workbook.lineGuide, false);
});
test('tracking and punctuation backup inputs are bounded and sanitized', () => {
  const workbook = sanitizeWorkbook({ readingWord: -5, punctuationIndex: 99, wordMarkers: 'true', punctuationDraft: 'a'.repeat(3000), punctuationAnswers: { pun1: { choice: 99, checked: true }, pun2: { choice: 1, checked: true }, invalid: { choice: 0 } } });
  assert.equal(workbook.readingWord, 0); assert.equal(workbook.punctuationIndex, 0); assert.equal(workbook.wordMarkers, false); assert.equal(workbook.punctuationDraft.length, 2000); assert.deepEqual(workbook.punctuationAnswers, { pun2: { choice: 1, checked: true } });
});
test('word tracking escapes content and leaves standalone punctuation unwrapped', () => {
  assert.equal(markedWords('« Sami ? »'), '« <span class="read-word">Sami</span> ? »');
  assert.ok(markedWords('<script>').includes('&lt;script&gt;'));
});
