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
  const state = emptyProgress(); state.workbook = { answers: { q1: 'Il semble inquiet.' }, writings: { w1: 'Mon journal.', w2: 'Sami raconte.' }, practiceAnswers: { p1: 0, p2: 2 }, selectedWriting: 'w2', fontSize: 28, wideSpacing: false };
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
