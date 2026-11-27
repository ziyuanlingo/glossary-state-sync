# @ziyuanlingo/glossary-state-sync

**English** | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

**Cross-Chapter Terminology State Table & Selective Recall Engine for ZiyuanLingo Document Translation Pipelines**

Official open-source terminology state synchronization library powering [ZiyuanLingo Cloud](https://ziyuanlingo.com) (`EN / 中文 / 日本語`).

---

## Overview

Injecting a 5,000-entry dictionary into every LLM translation prompt wastes context budget and degrades instruction adherence, yet omitting chapter-specific definitions causes severe terminology drift across book-length manuscripts. `@ziyuanlingo/glossary-state-sync` maintains a versioned 3-tier cross-chapter terminology state table (`locked`, `preferred`, `forbidden`) updated via incremental structured patches across 400+ page academic monographs, patent filings, and cross-border legal contracts—recalling only exact active spans per chapter chunk.

## Key Features

1. **Versioned 3-Tier Cross-Chapter State Table:** Manages `locked`, `preferred`, and `forbidden` terminology entries keyed by normalized language pair and source phrase, tracking monotonic state `revision` numbers and `chapterRef` provenance anchors.
2. **Incremental Structured Patch Sync:** Applies atomic `upsert` and `remove` patch batches (`applyStructuredPatch`) emitted as new entities or defined contractual terms are discovered mid-manuscript.
3. **Chunk-Scoped Selective Recall:** Scans incoming paragraph batches (`recallForChunk`) to retrieve only active terms appearing in the current chunk, ordered by descending source span length so multi-word phrases take precedence over shorter substrings.
4. **Deterministic Prompt Directive Serialization:** Formats matched entries into compact `<glossary_recall count="..." revision="...">` XML blocks ready for stateful translation prompts.

## Architecture

`GlossaryStateTable` stores normalized composite keys (`${langPair}::${source.toLowerCase()}`) in an in-memory state map with zero external runtime dependencies:

- **Mutation Layer (`upsert` / `applyStructuredPatch`):** Updates canonical term mappings while incrementing `this.revision` on every state transition for deterministic cache invalidation and audit logging.
- **Recall & Ranking Layer (`recallForChunk` / `formatPromptDirective`):** Evaluates case-insensitive span containment against paragraph arrays or raw chapter text, sorting hits longest-first and serializing tier labels (`[LOCKED]`, `[PREFERRED]`, `[FORBIDDEN]`) with section references.

```text
glossary-state-sync/
├── src/
│   └── index.mjs              # GlossaryStateTable state sync & selective recall engine
├── test/
│   └── recall-sync.test.mjs   # Cross-chapter patch & prompt directive unit tests
├── package.json
└── LICENSE
```

## Quick Start

```javascript
import { GlossaryStateTable } from '@ziyuanlingo/glossary-state-sync';

// 1. Initialize cross-chapter state table with foundational defined terms
const table = new GlossaryStateTable([
  {
    source: 'Indemnifying Party',
    target: '赔偿方',
    langPair: 'en-zh',
    tier: 'locked',
    chapterRef: 'sec-1.1'
  }
]);

// 2. Apply incremental structured patches discovered in subsequent chapters
table.applyStructuredPatch([
  {
    action: 'upsert',
    source: 'cumulative liability',
    target: '累计赔偿责任',
    langPair: 'en-zh',
    tier: 'locked',
    chapterRef: 'sec-4.2'
  }
]);

// 3. Emit a selective <glossary_recall> directive for the active paragraph chunk
const directive = table.formatPromptDirective(
  ['The Indemnifying Party shall cap cumulative liability at USD 500,000.'],
  'en-zh'
);
console.log(directive);
/*
<glossary_recall count="2" revision="2">
- [LOCKED] "cumulative liability" => "累计赔偿责任" (ref: sec-4.2)
- [LOCKED] "Indemnifying Party" => "赔偿方" (ref: sec-1.1)
</glossary_recall>
*/
```

Run the unit test suite locally:

```bash
npm test
```

## License

Apache License 2.0 — [ZiyuanLingo](https://ziyuanlingo.com)
