/* 截图辅助（只给临时预览文件用）：切到「其他实时数据图标」页签，
   把标准版拆成左右两格的那两行（轿门传感器振动 横向 / 垂直）连同前后一行留下，
   其余行 display: none，好让它们出现在视口顶部 ——
   Chrome --headless --screenshot 拍的是视口第一屏，滚动无效，所以用隐藏代替滚动。
   ⚠️ 隐藏行会连带隐藏挂在那些行上的 rowspan 合并格（梯型 / 字段名 / LiveView），
   所以这张图只用来看标准版那两列，左边几列是残缺的，属预期。 */
(function () {
  function run() {
    selectTab('tab-live');
    var rows = [].slice.call(document.querySelectorAll('#tbodyLive tr'));
    var hit = rows.map(function (tr, i) {
      return tr.querySelectorAll('td.cell-std').length === 2 ? i : -1;
    }).filter(function (i) { return i >= 0; });
    var from = hit[0] - 2;
    var to = hit[hit.length - 1] + 1;
    rows.forEach(function (tr, i) {
      if (i < from || i > to) tr.style.display = 'none';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}());
