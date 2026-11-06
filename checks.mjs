import assert from 'node:assert/strict';
import {QUESTIONS,VERSES,KINDS,shuffled,createRound,submitAnswer,advanceRound,roundSummary} from './game-core.mjs';

assert.equal(QUESTIONS.length,12);
assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,12);
for(const kind of KINDS)assert.equal(QUESTIONS.filter(q=>q.kind===kind).length,4);
for(const q of QUESTIONS){assert.ok(VERSES[q.verse]);assert.ok(q.title&&q.prompt&&q.explanation&&q.hint);}
const original=QUESTIONS.map(q=>q.id);const mix=shuffled(QUESTIONS,()=>0);
assert.deepEqual(QUESTIONS.map(q=>q.id),original);
assert.deepEqual(mix.map(q=>q.id).sort(),[...original].sort());
assert.notDeepEqual(mix.map(q=>q.id),original);
assert.throws(()=>createRound([]));
const allRight=createRound(QUESTIONS,()=>.5);
assert.equal(advanceRound(allRight),false);
assert.equal(submitAnswer(allRight,'unknown'),null);
for(let i=0;i<12;i++){const q=allRight.questions[allRight.index];assert.equal(submitAnswer(allRight,q.kind).correct,true);assert.equal(submitAnswer(allRight,q.kind),null);assert.equal(advanceRound(allRight),true);}
assert.equal(allRight.complete,true);assert.equal(advanceRound(allRight),false);assert.equal(submitAnswer(allRight,'body'),null);
assert.equal(roundSummary(allRight).correct,12);assert.equal(roundSummary(allRight).missed.length,0);
const mixed=createRound(QUESTIONS,()=>.4);
for(let i=0;i<12;i++){const q=mixed.questions[mixed.index];submitAnswer(mixed,i%2?q.kind:KINDS[(KINDS.indexOf(q.kind)+1)%3]);advanceRound(mixed);}
const summary=roundSummary(mixed);assert.equal(summary.correct,6);assert.equal(summary.missed.length,6);assert.equal(summary.categories.reduce((sum,c)=>sum+c.correct,0),6);
const practice=createRound(summary.missed);
while(!practice.complete){submitAnswer(practice,practice.questions[practice.index].kind);advanceRound(practice);}
assert.equal(roundSummary(practice).correct,6);assert.equal(roundSummary(practice).missed.length,0);
console.log('Passed: 12 unique questions, balanced categories, verse links, shuffled rounds, scoring, duplicate-answer protection, progression and targeted practice.');

