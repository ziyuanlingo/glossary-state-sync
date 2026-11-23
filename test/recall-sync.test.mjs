import assert from 'node:assert/strict';
import { GlossaryStateTable } from '../src/index.mjs';
const table = new GlossaryStateTable([{ source: 'Indemnifying Party', target: '赔偿方', langPair: 'en-zh', tier: 'locked', chapterRef: 'sec-1.1' }]);
table.applyStructuredPatch([{ action: 'upsert', source: 'cumulative liability', target: '累计赔偿责任', langPair: 'en-zh', tier: 'locked', chapterRef: 'sec-4.2' }]);
const block = table.formatPromptDirective(['The Indemnifying Party shall cap cumulative liability at USD 500,000.'], 'en-zh');
assert.match(block, /<glossary_recall count="2"/);
console.log('glossary-state-sync tests passed');
