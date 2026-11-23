export class GlossaryStateTable {
  constructor(initialEntries = []) {
    this.entries = new Map();
    this.revision = 0;
    for (const item of initialEntries) this.upsert(item);
  }
  upsert({ source, target, langPair = 'en-zh', tier = 'locked', chapterRef = 'global' }) {
    if (!source || !target) throw new Error('Both source and target terms are required');
    const key = `${langPair}::${source.trim().toLowerCase()}`;
    this.entries.set(key, {
      source: source.trim(),
      target: target.trim(),
      langPair,
      tier,
      chapterRef,
      updatedAtRevision: ++this.revision
    });
    return this.entries.get(key);
  }
  applyStructuredPatch(patchOps = []) {
    let applied = 0;
    for (const op of patchOps) {
      if (op.action === 'upsert') { this.upsert(op); applied++; }
      else if (op.action === 'remove' && op.source) {
        const key = `${op.langPair || 'en-zh'}::${op.source.trim().toLowerCase()}`;
        if (this.entries.delete(key)) { this.revision++; applied++; }
      }
    }
    return { applied, revision: this.revision, size: this.entries.size };
  }
  recallForChunk(sourceParagraphs, langPair = 'en-zh') {
    const joined = (Array.isArray(sourceParagraphs) ? sourceParagraphs.join('\n') : String(sourceParagraphs)).toLowerCase();
    const matched = [];
    for (const entry of this.entries.values()) {
      if (entry.langPair === langPair && joined.includes(entry.source.toLowerCase())) matched.push(entry);
    }
    return matched.sort((a, b) => b.source.length - a.source.length);
  }
  formatPromptDirective(sourceParagraphs, langPair = 'en-zh') {
    const hits = this.recallForChunk(sourceParagraphs, langPair);
    if (!hits.length) return '';
    const lines = hits.map(h => `- [${h.tier.toUpperCase()}] "${h.source}" => "${h.target}" (ref: ${h.chapterRef})`);
    return `<glossary_recall count="${hits.length}" revision="${this.revision}">\n${lines.join('\n')}\n</glossary_recall>`;
  }
}
