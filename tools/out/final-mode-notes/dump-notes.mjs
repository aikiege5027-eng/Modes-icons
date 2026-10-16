/* 一次性：把「模式图标」表注释列的预置正文，按「最终整理版本 · 电梯模式」的
   同图合并分组导出，供写「常见示意」摘要用。用法：cd tools && node out/final-mode-notes/dump-notes.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const E = (s) => dom.window.eval(s);
const seeds = E('NOTE_SEEDS');
const modes = E('FINAL_SECTIONS').find((s) => s.key === 'modes');
const rows = E('ROWS');
const out = modes.items.map((it) => ({
  icon: it.name,
  group: it.zh,
  members: it.members.map((m) => {
    const r = rows.find((x) => E('rowId')(x) === m.row);
    return { zh: m.zh, en: m.en, note: seeds[m.row] || '' };
  }),
}));
writeFileSync(new URL('./notes-by-group.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('groups', out.length, 'members', out.reduce((n, g) => n + g.members.length, 0),
  'without note', out.flatMap((g) => g.members).filter((m) => !m.note).length);
dom.window.close();
