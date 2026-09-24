/* ============================================================
   要补的图标 —— 外部素材来源与改造参数
   （原名「要补的 6 个图标」；那 6 条里已有 4 条被设计新画的版本换掉，标题不再写死个数）

   背景：index.html「标准版」列有 21 行空槽。其中 10 行用库内现成图标补
   （见 STD_ICONS 里新增的那批），5 行语义待确认先跳过，剩下 6 行库里确实
   没有对应字形，从 TDesign Icons（Tencent，MIT）取素材后按 KONE 规范改造。

   ⚠️ 那 6 条里已有 4 条（robot / setting_off / relevel / relevel_slow）被设计在
   IOT Delivery 重画的版本换掉，配方移到文件末尾的 TDESIGN_ARCHIVE（不参与构建）。
   下面 ICONS 里现役的 TDesign 改造件只剩 pendant / shaft_learning 两条。

   ⚠️ 这些都没过 icon 评审。规范要求「每两周评审一次，设计好的 icon
   放入评审区」，所以它们在页面上带黄点标记，不能当作已入库图标使用。

   字段说明
     key      写进 STD_ICONS 的键
     name     KONE 命名（规范：无空格、不重复；变体后缀 -圆圈/-方形/-filled）
     zh       对应的模式名，用于自查
     targets  STD_ICON_TARGETS 里挂哪几行
     sources  外部素材，可多个（例：setting + slash 叠成 setting-off）
                name  TDesign 图标文件名
                pick  取源文件里哪些 path（按 id；TDesign 的真实几何都在 stroke* 上，
                      fill* 那几个是 fill="transparent" 的占位，必须排除）
                drop  剔除哪些 subpath（下标见构建报告）。16px 下元素过密时减元素，
                      而不是缩小线宽 —— 线宽必须恒为 1
     fit      把所有源的中心线合并 bbox 等比装进 box×box 并居中
     extras   额外的实心形状，已是 16 网格最终几何（圆点这类东西描边画不出来）
     note     选型理由与证据强弱，会写进页面 tooltip
   ============================================================ */

import { circle, rect, parsePath } from './geometry.mjs';

export const SOURCE_LIB = { lib: 'TDesign Icons', version: '0.4.7', license: 'MIT' };

/* 手绘那批的来源标签。写进 STD_ICONS 的 src 字段 → 页面 tooltip。
   必须有值：src 为空时 stdCell 会把来源标成 Design Token China，而这些图标
   并不在库里，那就是假来源。 */
export const HAND_DRAWN_SRC = 'KONE China icon 规范 · 新画（未入库、未过评审）';

export const ICONS = [
  /* setting_off 的配方已移到文件末尾的 TDESIGN_ARCHIVE：
     那一格换成了设计在 IOT Delivery 画的 No-Setting（12007:216438）。 */

  {
    key: 'pendant',
    name: 'pendant',
    zh: '吊坠',
    targets: ['Pendant'],
    sources: [{ name: 'calculator', pick: ['stroke1', 'stroke2'] }],
    fit: { box: 12 },
    note: '手持操作盒：竖长方盒 + 按键。库内无对应字形；KFPS 徽标用「方框 + 扳手」，但那与已占用的 elevator-maintenance（612:975）同形，会让两行显示同一个图标，所以不取。先试过 gamepad，16px 下两侧握把糊成一团、认不出是手持器，换成 calculator 的盒+键构成。证据最弱的一条，需评审确认。',
  },

  {
    key: 'shaft_learning',
    name: 'shaft-learning',
    zh: '井道自学习',
    targets: ['井道自学习'],
    sources: [{ name: 'measurement-2', pick: ['stroke1', 'stroke2'] }],
    fit: { box: 13 },
    note: '竖向井道框 + 上下双箭头量程线 = 井道行程自学习。纯语义提议，无图形证据（该行只有 IoT 侧有取值，KFPS / AMC 都没有对应徽标）。',
  },

  /* relevel 的配方已移到文件末尾的 TDESIGN_ARCHIVE：
     那一格换成了设计在 IOT Delivery 画的 Relevel（12007:216476）。 */

  /* relevel_slow 的配方已移到文件末尾的 TDESIGN_ARCHIVE：
     那一格换成了设计在 IOT Delivery 画的 relevel-slow（12007:216496）。 */

  /* ============================================================
     手绘的一对：优先高区 / 优先低区

     为什么必须新画：这两行原来用 arrow-up / arrow-down，被指出「像电梯正在上下行」。
     查过两遍确认库里补不了 ——
       ① 按 floor / zone / level 搜 Design Token-China 库，没有任何楼层分区字形；
       ② 💰Icon 页的纵向字形全部是方向指示器：arrow-up/down、chevron-up/down、
          caret-up-small/down-small、arrow-up-kone（只有上）、backtop-M/L（只有上）、
          swap-1/2（双向）、四个斜向箭头。横向那套有双人字和端点符（page-first/last），
          纵向一个都没有，所以「靠构造把方向感变成区段感」在库里没有素材。
       而且 caret 是纯实心三角 —— 厅外楼层灯的运行方向指示业内就是这么画的，
       换过去比现在更容易混，chevron 只是把指向变模糊、上下这层读法没变。

     画法：井道剖面（竖向圆角矩形）+ 中线分区 + 被指的那一区打三条平行剖面线。
     改过两版，两版的教训都留着：
       v1 半区整块实心填充 —— 全表包括库内那 50 多个字形都是线性的，
          一块实心黑在一列图标里明显重一档，已弃。
       v2 半区一条对角线 —— 线性了，但「方框 + 一条斜线」在制图里也读作
          「此处为空 / 作废」，而本表的 bias（612:889）正是用一条裸斜线表示 NULL。
       v3（现在）三条平行剖面线，按手绘草图的排布：一条走对角，两个角各补一条短的。
          三条平行线是制图里表达「这块区域被填充 / 剖切」的标准画法，
          与「一条斜线 = 划掉」区分得开，也仍然全线性、没有实心块。
     extras 为空 —— 这是本批唯一不需要实心形状的两个。

     几何（16 网格，中心线坐标；全部落在半整数上，mapToGrid 的吸附不会挪动它们）
       外框中心线  x 3.5~12.5、y 1.5~14.5，1px 描边后外轮廓 10×14，画框内居中
       中线        高区 y=8.5、低区 y=7.5 —— 两个图标关于 y=8 互为镜像
       剖面线（高区，被指区是 y 1.5~8.5）
         短线（左上）  (3.5,5.5)→(8.5,1.5)
         长线（对角）  (3.5,8.5)→(12.5,1.5)
         短线（右下）  (7.5,8.5)→(12.5,4.5)
       低区是以上三条关于 y=8 的镜像。
       端点全部压在外框或中线的**中心线**上，描边后与框线连成一体，没有悬空线头。
       三条线的垂直间距都是 3 单位（垂直于线约 2.4），是「够疏能看出是斜向填充、
       又不至于在 16px 下并成一片」的折中。
     为什么中线不在正中 y=8：1px 线的中心线必须落在半整数上才压得住像素边界
     （mapToGrid 的 snapLines 会把整数强行吸到 x.5）。外轮廓高 14 是偶数，
     正中就是整数 8，落不到半整数上，所以两个图标各偏 0.5、互为镜像 ——
     单看每一个都是「上半 / 下半」，两个并排看是严格对称的一对。

     ⚠️ 评审时要看的两点：
       1. 16px 下这三条斜线不可能是三条干净的线。斜线压不住像素格，实测
          （按 16px 真实渲染逐像素看过）被指区呈现为一片有方向的灰色纹理，
          能看出是斜向填充、但数不清几条。这是尺寸决定的，不是画法问题；
          更疏的两条线版本干净一些但离草图更远，需要时可切。
       2. 这一对仍然**不表达「优先」**。AMC 侧用「菱形里一个 1」编码优先级，
          库里没有等价字形（digit 是数字键盘、Registered 是圆圈 R）。
          这一层缺口与 PRL / PRC 那一对相同，已在 STD_ICON_DISPUTES 里记着。
     ============================================================ */
  {
    key: 'zone_high',
    name: 'zone-high',
    zh: '优先高区',
    targets: ['Priority Landing High'],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '井道剖面 + 上半区剖面线',
      centerlines: 'M3.5 1.5L12.5 1.5L12.5 14.5L3.5 14.5Z'   // 外框
        + 'M3.5 8.5L12.5 8.5'                                // 中线（高区偏下 0.5）
        + 'M3.5 5.5L8.5 1.5'                                 // 剖面线·左上短
        + 'M3.5 8.5L12.5 1.5'                                // 剖面线·对角长
        + 'M7.5 8.5L12.5 4.5',                               // 剖面线·右下短
    }],
    fit: { raw: true },
    note: '新画：井道剖面 + 中线分区 + 上半区三条平行剖面线 = 高区。三条平行线是制图里「这块区域被填充」的标准画法，全线性无实心块，与全表其余字形同一视觉重量。原来用 arrow-up，被指出像电梯上行方向；库里没有任何楼层分区字形，纵向字形全是方向指示器，所以只能新画。与 zone-low 关于中线镜像。仍不表达「优先」—— 库里没有优先级字形，与 PRL / PRC 同一缺口。未过 icon 评审。',
  },

  {
    key: 'zone_low',
    name: 'zone-low',
    zh: '优先低区',
    targets: ['Priority Landing Low'],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '井道剖面 + 下半区剖面线',
      centerlines: 'M3.5 1.5L12.5 1.5L12.5 14.5L3.5 14.5Z'   // 外框
        + 'M3.5 7.5L12.5 7.5'                                // 中线（低区偏上 0.5）
        + 'M3.5 10.5L8.5 14.5'                               // 剖面线·左下短
        + 'M3.5 7.5L12.5 14.5'                               // 剖面线·对角长
        + 'M7.5 7.5L12.5 11.5',                              // 剖面线·右上短
    }],
    fit: { raw: true },
    note: '新画：井道剖面 + 中线分区 + 下半区三条平行剖面线 = 低区。与 zone-high 关于中线严格镜像。原来用 arrow-down，被指出像电梯下行方向。⚠️ 16px 下三条斜线会呈现为一片有方向的灰色纹理、数不清几条，这是尺寸决定的；更疏的两条线版本更干净但离设计草图更远。仍不表达「优先」。未过 icon 评审。',
  },

];

/* ============================================================
   扶手带 —— 候选归档（**不参与构建**；已被设计重画的第三版取代）
   这批是给「其他实时数据图标」表 扶梯 左 / 右扶手温度 两行找标准版时画的中心线草稿。
   最后落地的那张不在这里，也不是这条流水线的产物 ——
   它是「库内 click 的手型 + 新增扶手带横线」，见 index.html 的 LIVE_STD_ICONS.handrail
   与生成脚本 tools/out/noise-level/build-k.mjs。
   为什么归档而不是删掉：这 8 版是「16px 下画不出张开的手」这个结论的证据，
   渲图在 tools/out/noise-level/handrail-candidates*.png，光有图没有中心线就复现不了。
   为什么不留在 ICONS 里：normalize-icon 会把 ICONS 全量写进 tools/out/std-icons.js，
   那个文件是要整段贴进 index.html 的 STD_ICONS 的 —— 混进 8 个废案就是个坑。
   ⚠️ 最终落地的既不是这批候选、也不是那两版自画图（handrail / handrailLv，都已删）——
   设计后来在 IOT Delivery 重画了一对（左 12003:216335 / 右 12003:216319），
   见 index.html 的 LIVE_STD_ICONS.handrailLeft / handrailRight。
   这批留着只作为「16px 下 1px 描边画不出张开的手」这个结论的证据。
   想重跑看图：把 HANDRAIL_CANDIDATES 展开进上面的 ICONS 数组，
   cd tools && npm run build && cd out/noise-level && node render-candidates.mjs handrail-a …
   ============================================================ */
export const HANDRAIL_CANDIDATES = [
  {
    key: 'handrail_lv',
    name: 'handrail-lv',
    zh: '扶手带（LV 定稿：侧视手 + 连续单线带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: 'LiveView 构图改线型 · 连续单线带 · 长边 14',
      /* 三轮修出来的，两个坑记在这里：
         1. **掌底不能贴着带**。LV1 把掌底放在 y10.5、带放在 y11.5，描边后两者是
            10~11 与 11~12 两条紧邻的墙，simplify 会把它们并成一条 2px 粗的横杠 ——
            看着就是线宽翻倍，违反「线宽恒为 1」。定稿把掌底提到 y9.5、带压到 y11.5，
            中间留出 1px 白（y10~11）。代价是手不再「压」在带上，而是「悬在带上方、
            指尖钩到带下面」—— 16px 下这是唯一能同时保住 1px 和保住「抓」的排法。
         2. **带不打断，让指尖横穿**。原来学 LiveView 把带断成左右两段、中间让手穿过，
            但手的右缘（x12.5 描边到 13）与右段起点之间只剩 0.5px 缝，16px 下是一团灰。
            改成带连续、指尖从上面穿过去 —— 交叉点并成一个 T 字接头，这是线稿里正常的
            「前后关系」画法，比 0.5px 的缝干净。
         手的轮廓：左上楔形（小臂 / 手背）→ 向右下弯（掌）→ 指尖下探过带。
         坐标全部在半整数上，描边后落在整数格。 */
      centerlines: 'M2.5 2.5L6.5 2.5L7.5 5.5L11.5 8.5L12.5 10.5L11.5 13.5L10.5 10.5L8.5 9.5L4.5 9.5L3.5 8.5L3.5 5.5Z'
        + 'M1.5 11.5L14.5 11.5',
    }],
    fit: { raw: true },
    note: 'LV 定稿。',
  },

  /* ---------- 第二轮：照 LiveView 那张的构图改线型 ----------
     LiveView 原图的构造（20 网格实底，见 tools/out/noise-level/lv-handrail-big.png）：
       左上一块楔形 = 小臂 / 手背，向右下弯到指尖，指尖钩在一条水平扶手带的下面；
       带是一条 2 单位厚的实心横条，在手经过的位置被打断，右侧还留一小段。
     改线型的做法：把那个实底剪影的轮廓当中心线描 1px，细节做两处简化 ——
       指尖那个 0.5 单位的小缺口去掉（16px 下必然糊成一团）；
       坐标全部吸到半整数上（原图坐标是 0.8 缩放的余数，不落格）。
     带的厚度两种试法：LV1 一条线（库里画栏杆的惯例），LV2 两条线（保留「带有厚度」）。 */
  {
    key: 'handrail_lv1',
    name: 'handrail-lv1',
    zh: '扶手带（LV1：侧视手 + 单线带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: 'LiveView 构图改线型 · 单线带',
      centerlines: 'M2.5 3.5L6.5 3.5L7.5 6.5L11.5 9.5L12.5 11.5L11.5 13.5L10.5 11.5L8.5 10.5L4.5 10.5L3.5 9.5L3.5 6.5Z'
        + 'M0.5 11.5L9.5 11.5'                                 // 带（左段，被手打断）
        + 'M13 11.5L15.5 11.5',                                // 带（右段）
    }],
    fit: { raw: true },
    note: 'LV1。',
  },
  {
    key: 'handrail_lv2',
    name: 'handrail-lv2',
    zh: '扶手带（LV2：侧视手 + 双线带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: 'LiveView 构图改线型 · 双线带（保留厚度）',
      centerlines: 'M2.5 2.5L6.5 2.5L7.5 5.5L11.5 8.5L12.5 10.5L11.5 13.5L10.5 10.5L8.5 9.5L4.5 9.5L3.5 8.5L3.5 5.5Z'
        + 'M0.5 10.5L9.5 10.5'                                 // 带上沿（左段）
        + 'M13 10.5L15.5 10.5'                                 // 带上沿（右段）
        + 'M0.5 12.5L9.5 12.5'                                 // 带下沿（左段）
        + 'M13 12.5L15.5 12.5',                                // 带下沿（右段）
    }],
    fit: { raw: true },
    note: 'LV2。',
  },
  {
    key: 'handrail_lv3',
    name: 'handrail-lv3',
    zh: '扶手带（LV3：侧视手 + 带端头的带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: 'LiveView 构图改线型 · 带画成扁圆端头（更像一条带）',
      centerlines: 'M2.5 2.5L6.5 2.5L7.5 5.5L11.5 8.5L12.5 10.5L11.5 13.5L10.5 10.5L8.5 9.5L4.5 9.5L3.5 8.5L3.5 5.5Z'
        + 'M1.5 10.5L9.5 10.5'
        + 'M13 10.5L14.5 10.5'
        + 'M1.5 12.5L9.5 12.5'
        + 'M13 12.5L14.5 12.5'
        + 'M1.5 10.5C0.5 10.5 0.5 12.5 1.5 12.5'               // 左端头（半圆）
        + 'M14.5 10.5C15.5 10.5 15.5 12.5 14.5 12.5',          // 右端头（半圆）
    }],
    fit: { raw: true },
    note: 'LV3。',
  },
  /* ============================================================
     扶手带 —— 给「其他实时数据图标」表的 扶梯 左 / 右扶手温度 两行用（两行共用一张）。
     ⚠️ 这一条与上面那些不同：它不进 STD_ICONS（模式图标表），产物要贴进 index.html 的
     LIVE_STD_ICONS，所以 targets 是空数组。
     为什么要新画：库里没有扶手带字形（按 handrail / 扶手 / 扶手带 检索过），
     三个平台现在的做法都不能直接用 ——
       云视界 / IoT  用 click（点击 / 触摸），语义是交互类，不是扶手带这个部件；
       LiveView     画的是「手搭在倾斜扶手带上」，语义最准，但是 20 网格白色实底，
                    风格与标准版这一列的线性不符，缩到 16 线宽也会塌。
     构造取 LiveView 的语义、按用户给的方向简化：一只张开的手 + 一条直的扶手带，
     不做「一根手指 + 光圈」（那是 click 的点击语义）。
     候选三版，选型见 tools/out/handrail-candidates.png，最后留下的那版注释在下面。
     ============================================================ */
  {
    key: 'handrail_a',
    name: 'handrail-a',
    zh: '扶手带（候选 A：横带 + 四指）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '横向扶手带 + 张开的四指 + 掌 + 拇指',
      centerlines: 'M1.5 3.5L14.5 3.5'                        // 扶手带（通宽横线）
        + 'M5.5 4.5L5.5 7.5'                                  // 指 1
        + 'M7.5 4.5L7.5 7.5'                                  // 指 2
        + 'M9.5 4.5L9.5 7.5'                                  // 指 3
        + 'M11.5 4.5L11.5 7.5'                                // 指 4
        + 'M4.5 7.5L4.5 12.5L12.5 12.5L12.5 7.5'              // 掌（上沿开口）
        + 'M4.5 9.5L2.5 9.5',                                 // 拇指
    }],
    fit: { raw: true },
    note: '候选 A。',
  },

  {
    key: 'handrail_b',
    name: 'handrail-b',
    zh: '扶手带（候选 B：斜带 + 手搭在上面）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '倾斜扶手带 + 手掌压在带上 + 三指垂下',
      centerlines: 'M1.5 12.5L14.5 6.5'                       // 扶手带（倾斜）
        + 'M4.5 9.5L11.5 6.5'                                 // 掌背（与带平行）
        + 'M4.5 9.5L4.5 11.5'                                 // 指 1（垂到带下）
        + 'M7 8.5L7 10.5'                                     // 指 2
        + 'M9.5 7.5L9.5 9.5'                                  // 指 3
        + 'M11.5 6.5L13 5.5',                                 // 拇指 / 腕
    }],
    fit: { raw: true },
    note: '候选 B。',
  },

  {
    key: 'handrail_d',
    name: 'handrail-d',
    zh: '扶手带（候选 D：三指 + 掌，掌底即扶手带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '三指张开的手坐在通宽扶手带上',
      /* 手是**开口**轮廓（底边不画），由通宽的扶手带当掌底 —— 手就「坐」在带上。
         指宽 2 单位（描边后 3px，中间留 1px 白），指间空 2 单位（两侧描边之间留 1px 白）。
         这两个数是 16 网格上「1px 线宽 + 看得见的缝」的下限，再挤就糊成一片。 */
      centerlines: 'M2.5 11.5L2.5 5.5L4.5 5.5L4.5 8.5'        // 指 1 + 掌顶
        + 'M4.5 8.5L6.5 8.5'                                  // 掌顶（指 1↔2）
        + 'M6.5 8.5L6.5 5.5L8.5 5.5L8.5 8.5'                  // 指 2
        + 'M8.5 8.5L10.5 8.5'                                 // 掌顶（指 2↔3）
        + 'M10.5 8.5L10.5 5.5L12.5 5.5L12.5 11.5'             // 指 3 + 掌右侧
        + 'M1 11.5L15 11.5',                                  // 扶手带（通宽，兼作掌底）
    }],
    fit: { raw: true },
    note: '候选 D。',
  },

  {
    key: 'handrail_e',
    name: 'handrail-e',
    zh: '扶手带（候选 E：三指 + 掌 + 拇指，手在带上方）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '闭合手型 + 拇指 + 下方扶手带',
      centerlines: 'M2.5 10.5L2.5 5.5L4.5 5.5L4.5 8.5L6.5 8.5L6.5 5.5L8.5 5.5L8.5 8.5L10.5 8.5L10.5 5.5L12.5 5.5L12.5 10.5Z'
        + 'M2.5 8.5L1 9.5'                                    // 拇指
        + 'M1 12.5L15 12.5',                                  // 扶手带
    }],
    fit: { raw: true },
    note: '候选 E。',
  },

  {
    key: 'handrail_f',
    name: 'handrail-f',
    zh: '扶手带（候选 F：侧视手搭在斜带上）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '倾斜扶手带 + 侧视的手（闭合轮廓）+ 两指垂过带面',
      centerlines: 'M1.5 12.5L14.5 6.5'                       // 扶手带（倾斜）
        + 'M4.5 9.5L9.5 5.5L12 6.5L7 10.5Z'                   // 手（与带平行的闭合块）
        + 'M5.5 10L5.5 12'                                    // 指 1（垂过带面）
        + 'M8 8.5L8 10.5',                                    // 指 2
    }],
    fit: { raw: true },
    note: '候选 F。',
  },

  {
    key: 'handrail_g',
    name: 'handrail-g',
    zh: '扶手带（候选 G：实心侧视手 + 斜带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '倾斜扶手带（线）',
      centerlines: 'M1.5 12.5L14.5 7.5',
    }],
    /* 手改成实心块：1px 轮廓画不出 16px 下可辨的手（候选 A~F 全糊），
       实心剪影在这个尺寸反而清楚 —— 库里也有实心元素的先例（bias 整条斜线、
       robot 的两只眼睛）。构图照 LiveView 那张：侧视的手压在带上。 */
    extras: [
      () => parsePath('M3 5.5L6.5 5.5L9 8L11.5 9.5L11.5 10.5L5.5 10.5L4.5 8L3 6.5Z')[0],
    ],
    fit: { raw: true },
    note: '候选 G。',
  },

  {
    key: 'handrail_h',
    name: 'handrail-h',
    zh: '扶手带（候选 H：倾斜的扶手带环）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '倾斜的闭合带环（跑道形）',
      /* 不画手，直接画部件本身 —— 与这一列其余图标同一个口径
         （齿轮箱振动画箱体、速度画表盘、噪音画喇叭，都是部件 / 量，不是手势）。
         扶手带是一条绕过两端导轮的闭合环，所以画成倾斜的跑道形。 */
      centerlines: 'M4 11.5L12 6.5'
        + 'M4 11.5C2.5 11.5 2.5 9.5 4 9.5'
        + 'M4 9.5L12 4.5'
        + 'M12 4.5C13.5 4.5 13.5 6.5 12 6.5',
    }],
    fit: { raw: true },
    note: '候选 H。',
  },

  {
    key: 'handrail_l',
    name: 'handrail-l',
    zh: '扶手带（候选 L：连指手套式的手 + 下方横带）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '闭合手型（浅指缝，连指手套式）+ 拇指 + 通宽扶手带',
      /* 与候选 D / E 的区别：指缝只开到 y6.5（浅），手指不是四根独立的竖棍，
         整只手是一个连指手套式的轮廓 —— click 之所以在 16px 下认得出是手，
         靠的就是圆掌 + 拇指这两个特征，不是手指分得开。 */
      centerlines: 'M3.5 12.5L3.5 4.5L5.5 4.5L5.5 6.5L7.5 6.5L7.5 4.5L9.5 4.5L9.5 6.5L11.5 6.5L11.5 5.5L13 5.5L13 12.5Z'
        + 'M3.5 9.5L1.5 10.5'                                 // 拇指
        + 'M1 14.5L15 14.5',                                  // 扶手带（通宽）
    }],
    fit: { raw: true },
    note: '候选 L。',
  },

  {
    key: 'handrail_c',
    name: 'handrail-c',
    zh: '扶手带（候选 C：横带 + 三指 + 圆掌）',
    targets: [],
    srcLabel: HAND_DRAWN_SRC,
    sources: [{
      label: '横向扶手带 + 三指 + 圆角掌',
      centerlines: 'M1.5 4.5L14.5 4.5'                        // 扶手带
        + 'M6 5.5L6 8'                                        // 指 1
        + 'M8 5.5L8 8'                                        // 指 2
        + 'M10 5.5L10 8'                                      // 指 3
        + 'M4.5 8.5L4.5 11C4.5 12.5 6 12.5 6 12.5L11 12.5C12.5 12.5 12.5 11 12.5 11L12.5 8.5'
        + 'M4.5 8.5L11.5 8.5',                                // 掌上沿
    }],
    fit: { raw: true },
    note: '候选 C。',
  },
];

/* ============================================================
   TDesign 改造配方归档（**不参与构建**）
   这四格原来用的就是这四条：TDesign Icons 素材按 normalize-icon 流水线
   改造成 16 网格单条 path。2026-09 起依次换成了设计在 IOT Delivery 画的版本：
     robot        → Robot          12007:216383
     setting_off  → No-Setting     12007:216438
     relevel      → Relevel        12007:216476
     relevel_slow → relevel-slow   12007:216496
   见 index.html 的 STD_ICONS 对应条目。
   ⚠️ relevel_slow 那一格换完之后与 relevel 几乎一模一样（20px 下墨量差 0.0072），
   旧版这条配方（底线 + 单向下箭头）恰好是「两行怎么分开」的另一种答案，
   所以它比另外三条更值得留着 —— 万一评审要求恢复可读的区分，先看它。
   为什么归档而不是删：它们是「这几格曾经取自外部素材、为什么这么改」的唯一记录。
   为什么不留在 ICONS 里：normalize-icon 会把 ICONS 全量写进 tools/out/std-icons.js，
   那个文件是要整段贴进 index.html 的 —— 留着就会把已经被替换掉的旧版又贴回去。
   想重跑看图：把 TDESIGN_ARCHIVE 展开进上面的 ICONS 数组再 npm run build。
   （这个导出原名 ROBOT_TDESIGN_ARCHIVE，只装 robot 一条；后来又归档了两条，改成现名。
     没有别的文件 import 过它 —— normalize-icon.mjs 只 import { ICONS, SOURCE_LIB }。）
   ============================================================ */
export const TDESIGN_ARCHIVE = [
  {
    key: 'robot',
    name: 'robot',
    zh: '自动引导',
    targets: ['Automatically Guided Vehicle'],
    sources: [
      { name: 'robot', pick: ['stroke1'], drop: [0, 1] },   // 0/1 是两侧支脚
      { name: 'robot', pick: ['stroke2'], drop: [1, 2] },   // 只留 0（嘴），1/2 是两眼
    ],
    fit: { box: 12 },
    extras: [
      // 两只眼睛：源图里是 stroke-width 2 描一个 r=0.5 的圆，等于实心点，
      // 描边搬不过来，直接按 16 网格给实心圆
      (b) => circle(b.x + 3.5, b.y + 5.5, 0.75),
      (b) => circle(b.x + 8.5, b.y + 5.5, 0.75),
    ],
    note: 'AMC 侧用 robot-2（圆顶机身 + 两眼 + 嘴），TDesign robot 是同一套构成，取其机身与天线；两眼按 16 网格重画成实心点。已剔除源图的两侧支脚（16px 下与机身边线粘连）。',
  },

  {
    key: 'setting_off',
    name: 'setting-off',
    zh: '未设置',
    targets: ['No Setup'],
    sources: [
      { name: 'setting', pick: ['stroke1', 'stroke2'] },
      { name: 'slash', pick: ['stroke1'] },
    ],
    fit: { box: 13 },
    note: 'KFPS 的 no-setup 徽标就是「六边形齿轮 + 斜杠」，TDesign setting 正是六边形套圆，slash 提供同角度斜杠，构成逐项对得上。库内 setting（612:1701）已被 Setup 行占用，这里是它的否定态，按规范命名为 setting-off。',
  },

  {
    key: 'relevel',
    name: 'relevel',
    zh: '再平层',
    targets: ['再平层'],
    sources: [{ name: 'align-vertical', pick: ['stroke1', 'stroke2'] }],
    fit: { box: 13 },
    note: '中线 + 上下双向向中线收拢的箭头 = 回到平层位置。与下面的 relevel-slow 靠「双向 / 单向」区分，避免两行撞图形。纯语义提议。',
  },

  {
    key: 'relevel_slow',
    name: 'relevel-slow',
    zh: '低速返平层',
    targets: ['低速返平层'],
    sources: [{ name: 'align-bottom', pick: ['stroke1', 'stroke2'] }],
    fit: { box: 13 },
    note: '底线 + 单向下箭头 = 低速返回平层。与 relevel 的双向箭头区分。库内 load speed（5156:31）已被 Reduced Speed 行占用，不复用。纯语义提议。',
  },
];
