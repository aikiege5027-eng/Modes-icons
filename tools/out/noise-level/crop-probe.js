/* 截图辅助（只给临时预览文件用）：把 LIVE_ROWS 裁到感兴趣的那一段再重新渲染，
   这样 rowspan 合并格是按这个子集重算的，截出来的表结构是完整的 ——
   比之前那种「把上面的行 display:none」的做法干净（那样会连带藏掉挂在被隐藏行上的
   合并格，左边几列看着是错位的）。
   ⚠️ LIVE_ROWS 是 const，但它是数组，splice 可以原地裁剪。
   ⚠️ 裁剪有两个可见副作用，看截图时别当成 bug：
     页签上的行数变成子集的行数（渲染函数按 LIVE_ROWS.length 写）；
     被切断的字段组如果只剩一行，「细分」那一格会按「只有一行的字段」规则留空
     （例如切到扶梯 运行状态 只剩「运行中」时，那一格是空的，整表里它是有字的）。
   用法：预览文件里注入本脚本，环境变量式的参数写死在下面两个常量里。 */
(function () {
  var FROM = 31;   // 从第几行开始留（0 基）
  var TO = 36;     // 留到第几行（含）
  function run() {
    selectTab('tab-live');
    LIVE_ROWS.splice(TO + 1);
    LIVE_ROWS.splice(0, FROM);
    renderLiveTable();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}());
