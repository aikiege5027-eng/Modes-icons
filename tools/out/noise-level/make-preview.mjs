/* 生成一个临时预览文件：index.html 原样 + 末尾注入 probe.js，并默认切到
   「其他实时数据图标」页签（页面本身不认 location.hash，只能注入）。
   放在仓库根目录是为了让 assets/ 的相对路径仍然有效。
   用法：node make-preview.mjs  → 写出 <repo>/.tmp-live-preview.html（用完删掉） */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const probe = readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const tag = '<script>\n' + probe + '\n<' + '/script>\n';
writeFileSync(new URL('.tmp-live-preview.html', root), html.replace('</body>', tag + '</body>'));
console.log('写出 .tmp-live-preview.html');
