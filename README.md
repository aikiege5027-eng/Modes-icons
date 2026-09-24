# 电梯模式图标 · 各平台应用现状

一张跨平台对照表，把同一个电梯模式在各个平台上用的图标横向摊开来看，并给出建议的「标准版」图标。

整个页面就是单个 `index.html`，没有构建步骤 —— 数据、样式、逻辑、以及每一处选型理由的注释全部在这一个文件里。用浏览器直接打开就能看。

## 页面内容

三个页签：

| 页签 | 行数 | 内容 |
|---|---|---|
| 模式图标 | 84 | 电梯运行模式（消防、检修、驻停、VIP…） |
| 梯形 / 功能图标 | 34 | 直梯 / 扶梯 / 人行道等梯型，以及功能类图标 |
| 其他实时数据图标 | 42 | 温度、振动、噪音、能耗、客流这类实时数据项 |

横向对比的平台：AMC（参考）、内部工具（KFPS / IoT）、my KONE（MyDeviceView / 云视界 / 大屏）、LiveView，最后一列是建议的标准版。

## 「标准版」这一列是怎么定的

页面上一共 59 个不同的标准版图标，分三种来源，tooltip 里会标明每一个的真实出处：

- **库内引用（70 行）** —— 直接取 Design Token China 图标库里的现成字形，首选这条路。
- **非库内（9 行）** —— 库里确实没有对应字形，分三类：
  - 设计在 IOT Delivery 文件里按库规范画的 5 个
  - 从 TDesign Icons 0.4.7（Tencent，MIT）取素材、按 KONE icon 规范改造的 2 个
  - 本项目新画的 2 个

非库内的这 9 个**都没过 icon 评审**，在页面上带黄点标记，不能当已入库图标使用。

标准版列的表头可以筛选，「有争议」的格子左上角有黄点，鼠标悬停看理由。注释列的内容存在浏览器 localStorage 里，只在本机可见，不进仓库。

## 打开方式

```sh
open index.html
```

就这样，不需要装依赖、不需要起服务。

也可以开 GitHub Pages 拿一个链接（Settings → Pages → Source 选 `main` 分支根目录）。
具体地址以那个页面上显示的为准。

## 校验脚本

`tools/` 下有几支脚本，用来卡住页面的不变量 —— 改完 `index.html` 应该跑一遍。

```sh
cd tools
npm i          # 只有跑脚本才需要装依赖，看页面不需要
npm run check  # = check-page.mjs && check-sizes.mjs，约 40s
```

- `check-page.mjs` —— 行数、图标渲染（每个标准版图标都得有 path、fill 全是 `currentColor`、viewBox 是 16 单位画框）、tooltip 来源构成、筛选 / 搜索 / 注释列的交互、争议标记的落盘与恢复。
- `check-sizes.mjs` —— 两张表的列宽自洽：定宽列合计 + 平台列 是否等于声明的表宽。
- `npm run build` —— 跑 `normalize-icon.mjs`，把 TDesign 素材按 16 网格重新描边、布尔合并成单条 path。产物在 `tools/out/`，需要手工贴进 `index.html`。
- `npm run sheet` —— 出一张放大联络表（`tools/out/contact-sheet.png`），用来目视复核改造和新画的图标。

## 目录

```
index.html              页面本体（数据 + 样式 + 逻辑 + 全部选型注释）
assets/
  amc/  kfps/           两个平台的徽标截图，用于图形比对
  kone-logo.svg
tools/
  check-page.mjs        页面行为与规范校验
  check-sizes.mjs       表格列宽自洽校验
  normalize-icon.mjs    外部素材 → 16 网格单条 path 的改造流水线
  icons.config.mjs      改造配方；被替换掉的旧配方归档在 TDESIGN_ARCHIVE
  geometry.mjs          描边 / 布尔运算的几何工具
  contact-sheet.mjs     放大联络表
  out/                  各次核对的产物与一次性校验脚本
```

`tools/out/` 里那些子目录是每次选型 / 替换时写的一次性核对脚本和它们的产物（渲染对照图、逐像素拟合读数、尺寸测量等）。`index.html` 的注释里引用了这些路径作为证据，所以一并留在仓库里。

## 一点约定

- 图标必须从 Figma 取真实 SVG path 内联使用，不画近似图形、不引用会过期的 Figma URL。
- 颜色统一用 `fill="currentColor"`，由 CSS 控制。
- 从 Figma 导出的节点经常带一个铺满画框的白底 `<rect>`，或者（整节点导出时）带画板外层的背景 path，必须剥掉再内联。
- 改动图标后要同步的地方不止一处：`STD_ICONS` 的条目、`STD_ICON_DISPUTES` 的争议文案、`check-page.mjs` 的名单与计数注释、`icons.config.mjs` 的配方归档。具体每一处的理由都写在对应位置的注释里。
