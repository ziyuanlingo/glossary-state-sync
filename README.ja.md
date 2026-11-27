# @ziyuanlingo/glossary-state-sync

[English](./README.md) | [简体中文](./README.zh-CN.md) | **日本語**

**ZiyuanLingo ドキュメント翻訳パイプライン向け 章間用語ステート同期テーブル & 選択的リコールエンジン**

[ZiyuanLingo Cloud](https://ziyuanlingo.com)（`EN / 中文 / 日本語`）を支える公式オープンソースの用語ステート同期ライブラリです。

---

## 概要

数千語規模の専門用語辞書を毎回そのまま LLM の翻訳プロンプトへ注入すると、コンテキスト枠を圧迫し指示追従精度が低下します。一方で章ごとの定義語を省略すれば、長編原稿の後半で深刻な訳語ブレ（ドリフト）が発生します。`@ziyuanlingo/glossary-state-sync` は、400ページを超える学術専門書、特許明細書、国際法務契約書において、増分パッチで更新されるバージョン管理付き 3層用語ステートテーブル（`locked`・`preferred`・`forbidden`）を維持し、翻訳対象チャンク内に出現する有効な用語スパンのみを高精度に抽出（リコール）します。

## 主な機能

1. **バージョン管理付き 3層・章間用語ステート同期テーブル：** 言語ペア（`langPair`）と正規化された原文フレーズをキーとして `locked`（必須固定）・`preferred`（推奨）・`forbidden`（使用禁止）の 3層エントリを管理し、単調増加するリビジョン番号（`revision`）と初出章アンカー（`chapterRef`）を記録します。
2. **増分構造化パッチ同期：** 原稿の読み進めに応じて新たに検出された固有名詞や契約上の定義語を、`upsert` / `remove` の構造化パッチ配列（`applyStructuredPatch`）としてアトミックに反映します。
3. **チャンク単位の選択的リコール & 最長一致優先ソート：** 入力段落バッチ（`recallForChunk`）を走査して当該チャンクに含まれる用語のみを抽出し、原文長の降順（最長一致優先）に整列することで複合語フレーズが部分文字列に埋もれるのを防ぎます。
4. **確定的プロンプト指示ブロック出力：** マッチした用語群をコンパクトな `<glossary_recall count="..." revision="...">` XML ブロックへシリアライズし、ステートフル翻訳プロンプトへ即座に組み込めます。

## アーキテクチャ

`GlossaryStateTable` は外部ランタイム依存ゼロのインメモリ Map 上で、正規化複合キー（`${langPair}::${source.toLowerCase()}`）を用いてステートを管理します。

- **ステート更新レイヤー（`upsert` / `applyStructuredPatch`）：** 用語マッピングの追加・更新・削除ごとに `this.revision` をインクリメントし、キャッシュ無効化判定や監査ログとの整合性を担保します。
- **選択的リコール・整列レイヤー（`recallForChunk` / `formatPromptDirective`）：** 段落配列または章テキストに対して大文字・小文字を区別しないスパン照合を実行し、最長フレーズ順に `[LOCKED]`・`[PREFERRED]`・`[FORBIDDEN]` タグと参照元セクション情報を出力します。

```text
glossary-state-sync/
├── src/
│   └── index.mjs              # GlossaryStateTable ステート同期 & 選択的リコールエンジン
├── test/
│   └── recall-sync.test.mjs   # 章間パッチ適用 & プロンプト指示出力の単体テスト
├── package.json
└── LICENSE
```

## クイックスタート

```javascript
import { GlossaryStateTable } from '@ziyuanlingo/glossary-state-sync';

// 1. 基本定義用語を指定して章間ステートテーブルを初期化
const table = new GlossaryStateTable([
  {
    source: 'Indemnifying Party',
    target: '赔偿方',
    langPair: 'en-zh',
    tier: 'locked',
    chapterRef: 'sec-1.1'
  }
]);

// 2. 後続の章で抽出された増分構造化パッチを適用
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

// 3. 翻訳対象の段落チャンクに対応する <glossary_recall> 指示ブロックを生成
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

ローカル環境での単体テスト実行：

```bash
npm test
```

## ライセンス

Apache License 2.0 — [ZiyuanLingo](https://ziyuanlingo.com)
