/* 注入到 index.html 末尾的量尺脚本（配合 make-preview.mjs 生成临时预览文件，
   用 Chrome --headless --dump-dom 把结果读回来）。
   量的是「其他实时数据图标」表的真实布局：表宽、各列宽、内容有没有被压到溢出、
   平台列里最宽的内容占多少、行高范围。全部是浏览器实测值，不是估算。 */
(function () {
  function run() {
    var out = [];
    try {
      selectTab('tab-live');
      var t = document.querySelector('#panel-live table');
      var card = document.querySelector('#panel-live .table-card');
      out.push('table=' + t.offsetWidth + ' card=' + card.offsetWidth
        + ' body=' + document.body.clientWidth + ' doc=' + document.documentElement.scrollWidth);
      var ths = [].slice.call(t.querySelectorAll('thead th'));
      out.push('cols ' + ths.map(function (th) {
        return th.textContent.trim() + '=' + th.offsetWidth;
      }).join(' '));
      /* 内容比格子宽 = 被压到溢出（折行不算溢出，折行后 scrollWidth 不会超） */
      var over = [];
      [].slice.call(t.querySelectorAll('tbody td, tbody th')).forEach(function (cell) {
        var inner = cell.firstElementChild;
        if (inner && inner.scrollWidth > inner.offsetWidth + 0.5) {
          over.push(cell.cellIndex + ':' + inner.className + ':' + inner.scrollWidth + '>' + inner.offsetWidth);
        }
      });
      out.push('overflow ' + (over.length ? over.join(' ') : 'none'));
      /* 标准版这一列要求名字不折行，所以单独量：每个名字的墨迹宽 vs 它所在格子的内容宽，
         以及有没有真的折成两行（offsetHeight 比单行行高 20px 大就是折了）。 */
      var wrapped = [];
      var widest = { w: 0, s: '' };
      [].slice.call(t.querySelectorAll('.cell-std .std-mode__label')).forEach(function (el) {
        var w = Math.ceil(el.scrollWidth);
        if (w > widest.w) widest = { w: w, s: el.textContent.trim() };
        if (el.offsetHeight > 21) wrapped.push(el.textContent.trim() + '(h' + el.offsetHeight + ')');
      });
      out.push('stdLabel widest=' + widest.w + '「' + widest.s + '」 wrapped='
        + (wrapped.length ? wrapped.join(' ') : 'none'));
      /* 两候选行：左右两格各自的宽度，确认真的拆成了两个单元格 */
      var pairRows = [];
      [].slice.call(t.querySelectorAll('tbody tr')).forEach(function (tr, i) {
        var stds = tr.querySelectorAll('td.cell-std');
        if (stds.length === 2) {
          pairRows.push('row' + i + '=[' + stds[0].offsetWidth + ',' + stds[1].offsetWidth + ']');
        }
      });
      out.push('pairRows ' + (pairRows.length ? pairRows.join(' ') : 'none'));
      /* col 元素上 CSS 到底生效没有，以及格子的内边距 —— 列宽算不对时先看这两项 */
      out.push('colCSS ' + [].slice.call(t.querySelectorAll('colgroup col')).map(function (c) {
        return (c.className || '?') + ':' + getComputedStyle(c).width;
      }).join(' '));
      var oneStd = t.querySelector('td.cell-std');
      var cs = getComputedStyle(oneStd);
      out.push('cellStd padding=' + cs.paddingLeft + '/' + cs.paddingRight
        + ' border=' + cs.borderLeftWidth + '/' + cs.borderRightWidth
        + ' contentW=' + oneStd.clientWidth);
      /* 行高是谁撑的：逐行找最高的那一格内容，统计各类内容当「最高」的次数。
         rowspan 合并格（LiveView / 梯型 / 字段名）跨多行，不逼单行变高，所以要排除掉 —— 
         只看这一行自己的格子。上下内边距一并打出来，才能算「内容 + padding = 行高」。 */
      var anyCell = t.querySelector('tbody td.cell-icon');
      var acs = getComputedStyle(anyCell);
      out.push('cellPad top/bottom=' + acs.paddingTop + '/' + acs.paddingBottom);
      var driver = {};
      [].slice.call(t.querySelectorAll('tbody tr')).forEach(function (tr) {
        var best = { h: 0, cls: '(空)' };
        [].slice.call(tr.children).forEach(function (cell) {
          if (cell.rowSpan > 1) return;
          var inner = cell.firstElementChild;
          if (!inner) return;
          var h = Math.ceil(inner.getBoundingClientRect().height);
          if (h > best.h) best = { h: h, cls: (inner.className || '?').split(' ')[0] };
        });
        var k = best.cls + '@' + best.h;
        driver[k] = (driver[k] || 0) + 1;
      });
      out.push('rowDriver ' + Object.keys(driver).sort().map(function (k) {
        return k + '×' + driver[k];
      }).join(' '));
      ['.iot-mode', '.yun-mode', '.overlay-mode', '.std-mode'].forEach(function (sel) {
        var w = 0; var h = 0; var n = 0;
        [].slice.call(t.querySelectorAll('tbody ' + sel)).forEach(function (el) {
          var r = el.getBoundingClientRect();
          w = Math.max(w, Math.ceil(r.width)); h = Math.max(h, Math.ceil(r.height)); n++;
        });
        out.push(sel + ' n=' + n + ' maxW=' + w + ' maxH=' + h);
      });
      var hs = [].slice.call(t.querySelectorAll('tbody tr')).map(function (tr) { return tr.offsetHeight; });
      out.push('rowHeight min=' + Math.min.apply(null, hs) + ' max=' + Math.max.apply(null, hs));
    } catch (e) {
      out.push('ERROR ' + e.message);
    }
    var pre = document.createElement('pre');
    pre.id = 'measure';
    pre.textContent = out.map(function (l) { return '@@ ' + l; }).join('\n');
    document.body.appendChild(pre);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}());
