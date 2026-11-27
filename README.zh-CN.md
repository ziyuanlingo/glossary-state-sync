# @ziyuanlingo/glossary-state-sync

[English](./README.md) | **简体中文** | [日本語](./README.ja.md)

**面向 ZiyuanLingo 长文档精译管线的跨章节术语状态同步表与按需精确召回引擎**

驱动 [ZiyuanLingo Cloud](https://ziyuanlingo.com)（`EN / 中文 / 日本語`）的官方开源术语状态同步核心库。

---

## 项目概述

在长篇文献翻译中，若将数千条全量词典塞入每一轮大语言模型提示词，不仅会浪费上下文预算并削弱指令遵循度，而一旦忽略特定章节的术语定义，又会导致百页级书稿前后译名严重漂移。`@ziyuanlingo/glossary-state-sync` 专为 400+ 页学术专著、专利申请卷宗与跨国法律合同打造，负责维护带版本演进的三级跨章节术语状态同步表（`locked` 强制锁定、`preferred` 优先推荐、`forbidden` 禁用译法），支持通过增量结构化补丁实时演进，并仅针对当前待译章节块精确召回命中的激活词条。

## 核心特性

1. **版本化三级跨章节术语状态同步表：** 按语向（`langPair`）与归一化源短语管理 `locked`、`preferred`、`forbidden` 三级术语条目，自动记录单调递增的修订版本号（`revision`）与章节溯源锚点（`chapterRef`）。
2. **增量结构化补丁同步：** 支持批量应用原子的 `upsert` 与 `remove` 补丁操作（`applyStructuredPatch`），可在文稿推进过程中实时吸纳新出现的专有实体或合同定义术语。
3. **章节分块精确召回与最长匹配优先：** 扫描待译段落批次（`recallForChunk`），仅召回当前分块中实际出现的激活术语，并按源术语字符长度降序排列，确保多词复合短语优先于短子串展示。
4. **确定性提示词指令序列化：** 将命中的术语自动格式化为紧凑的 `<glossary_recall count="..." revision="...">` XML 指令块，直接注入有状态翻译提示词管线。

## 架构设计

`GlossaryStateTable` 基于零外部运行时依赖的内存映射结构，采用归一化复合主键（`${langPair}::${source.toLowerCase()}`）管理状态：

- **状态变更层（`upsert` / `applyStructuredPatch`）：** 在更新规范术语映射的同时递增 `this.revision`，便于下游缓存失效判定与双语审校审计追踪。
- **按需召回与排序层（`recallForChunk` / `formatPromptDirective`）：** 对段落数组或章节原文执行大小写无关的短语包含匹配，按最长跨度优先排序后输出带层级标签（`[LOCKED]`、`[PREFERRED]`、`[FORBIDDEN]`）与章节引用的结构化指令。

```text
glossary-state-sync/
├── src/
│   └── index.mjs              # GlossaryStateTable 跨章节状态同步与按需召回引擎
├── test/
│   └── recall-sync.test.mjs   # 增量补丁同步与提示词指令生成单元测试
├── package.json
└── LICENSE
```

## 快速开始

```javascript
import { GlossaryStateTable } from '@ziyuanlingo/glossary-state-sync';

// 1. 使用基础定义术语初始化跨章节状态同步表
const table = new GlossaryStateTable([
  {
    source: 'Indemnifying Party',
    target: '赔偿方',
    langPair: 'en-zh',
    tier: 'locked',
    chapterRef: 'sec-1.1'
  }
]);

// 2. 应用后续章节解析出的增量结构化术语补丁
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

// 3. 为当前待译段落分块生成按需召回的 <glossary_recall> 提示词指令
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

在本地运行单元测试套件：

```bash
npm test
```

## 开源许可

Apache License 2.0 — [ZiyuanLingo](https://ziyuanlingo.com)
