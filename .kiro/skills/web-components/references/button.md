# Button 按钮（Web）

## 概述

**Figma 来源**：文件 `b5cc1y3jzLmOQkpa8vz5AX`（China Design system for web），页面 node-id `30382:113576`（`Button 按钮 ✅➕`）

| 内容 | node-id |
|---|---|
| `Button 按钮` 组件集 | `22709:32356` |
| `Button-demo 按钮示例`（设计示例页） | `30445:105683` |
| `Button_hero`（英雄按钮，独立组件集） | `30945:4124` |

**适用场景**：开启一个闭环操作任务（提交、删除、购买等）。

**TDesign 对应**：`t-button`。

> `Button_hero` 已单独落地为自建组件，规范见 `custom-components.md` 的 ButtonHero 章节，本文件不重复。

## 变体矩阵

| 维度 | Figma 变体名 | 取值 |
|---|---|---|
| 类型 | `variant 类型` | `base 基础` / `outline 描边按钮` / `dash 虚边按钮` / `text 文字按钮` / `ghost 幽灵按钮` |
| 尺寸 | `size 尺寸` | `small 小尺寸`(24) / `medium 中尺寸`(32) / `large 大尺寸`(40) |
| 主题 | `theme 主题样式` | `default 默认` / `primary 主要` / `Secondary 次要` / `danger 危险` |
| 形状 | `shape 形状` | `rectangle 矩形` / `round 圆角矩形` / `square 方形` / `circle 圆形` |
| 图标 | `icon 图标` + `⬑icon type 图标类型` | false / true × `prefixIcon 前置图标` / `suffixIcon 后置图标` / `singleIcon 独立图标` |
| 状态 | `state 状态` | `normal 默认` / `hover 悬停` / `active 点击` |
| 禁用 | `disabled 禁用` | false / true（禁用只与 `state=normal` 组合） |

**主题可用范围**：`Secondary 次要` 只在 `base 基础` 类型下存在；`outline` / `dash` / `text` / `ghost` 只有 `default` / `primary` / `danger` 三个主题。

## Token 映射

| Figma 变量 | 项目 CSS variable | 色值 |
|---|---|---|
| `Color/brand/brand-color` | `--brand-color` | `#1450f5` |
| `Color/brand/brand-color-hover` | `--brand-color-hover` | `#4373f7` |
| `Color/brand/brand-color-active` | `--brand-color-active` | `#1444c8` |
| `Color/brand/brand-color-disabled` | `--brand-color-disabled` | `#a1b9fb` |
| `Color/brand/brand-color-light` | `--brand-color-light` | `#f3f6fe` |
| `Color/brand/brand-color-light-hover` | `--brand-color-light-hover` | `#d0dcfd` |
| `Color/brand/brand-color-light-active` | `--brand-color-light-active` | `#a1b9fb` |
| `Color/brand/brand-color-light-disabled` | `--brand-color-light-disabled` | `#f3f6fe` |
| `Color/error/error-color` | `--error-color` | `#f51414` |
| `Color/error/error-color-hover` | `--error-color-hover` | `#f74343` |
| `Color/error/error-color-active` | `--error-color-active` | `#c41010` |
| `Color/error/error-color-disabled` | `--error-color-disabled` | `#fba1a1` |
| `Color/grey/bg-color-container` | `--bg-color-container` | `#ffffff` |
| `Color/grey/bg-color-component` | `--bg-color-component` | `#f2f4f7` |
| `Color/grey/bg-color-component-active` | `--bg-color-component-active` | `#8f9195` |
| `Color/grey/bg-color-component-disabled` | `--bg-color-component-disabled` | `#f2f4f7` |
| `Color/grey/component-border` | `--component-border` | `#c8cad0` |
| `Color/grey/component-stroke` | `--component-stroke` | `#dfe1e8` |
| `text/text-color-primary` | `--text-color-primary` | `#141414` |
| `text/text-color-secondary` | `--text-color-secondary` | `#676a72` |
| `text/text-color-disabled` | `--text-color-disabled` | `#abadb2` |
| `text/text-color-white` | `--text-color-white` | `#ffffff` |
| `text/text-color-brand` | `--text-color-brand` | `#1450f5` |
| `radius/radius-default` | `--radius-default` | `4px` |
| `radius/radius_full` | `--radius-circle` | Figma `128px` → Web `9999px` |

## 尺寸规范

| size | 高度 | 内边距 | 字号 / 行高 | 字重 | icon 尺寸 | gap（icon ↔ 文字） |
|---|---|---|---|---|---|---|
| small | `24px` | `2px 8px` | `12px / 20px`（Foot 12/Regular） | `400` | `14px` | `4px` |
| medium | `32px` | `5px 16px` | `14px / 22px`（Body 14/Regular） | `400` | `16px` | `8px` |
| large | `40px` | `8px 24px` | `16px / 24px`（H7 16/Regular） | `400` | `18px` | `12px` |

- 内容水平垂直居中（`justify-content: center`、`align-items: center`）
- 纵向内边距（2 / 5 / 8）是为凑 24 / 32 / 40 固定高度反推出来的，照抄即可
- 描边算在按钮尺寸内（Figma inside stroke），CSS 用 `box-sizing: border-box`，否则 outline / dash / ghost 会比设计稿高 2px

## 形状规范

| shape | 圆角 | 尺寸行为 |
|---|---|---|
| `rectangle 矩形` | `radius-default 4px` | 宽度随内容 |
| `round 圆角矩形` | `radius_full` → Web `var(--radius-circle)` `9999px` | 宽度随内容 |
| `square 方形` | `radius-default 4px` | 正方形，边长 = 高度（24 / 32 / 40），仅放 `singleIcon`，icon 居中 |
| `circle 圆形` | `radius_full` → Web `var(--radius-circle)` | 正方形，边长 = 高度，仅放 `singleIcon`，icon 居中 |

> `round` / `circle` 在 Figma 中用 `radius_full = 128px` 表达全圆；Web 一律写 `var(--radius-circle)`（`9999px`），不得写 `50%`，也不要照抄 `128px`。

## 配色规范 — base 基础

| theme | normal | hover | active | disabled |
|---|---|---|---|---|
| `primary` | 底 `brand-color`，字 `text-color-white` | 底 `brand-color-hover` | 底 `brand-color-active` | 底 `brand-color-disabled`，字白色 |
| `Secondary` | 底 `brand-color-light`，字 `text-color-brand` | 底 `brand-color-light-hover` | 底 `brand-color-light-active`，字 `brand-color-active` | 底 `brand-color-light-disabled`，字 `brand-color-disabled` |
| `default` | 底 `bg-color-component`，字 `text-color-primary` | 底 `component-border` `#c8cad0` | 底 `bg-color-component-active` `#8f9195` | 底 `bg-color-component-disabled`，字 `text-color-disabled` |
| `danger` | 底 `error-color`，字白色 | 底 `error-color-hover` | 底 `error-color-active` | 底 `error-color-disabled`，字白色 |

base 无边框。

## 配色规范 — outline 描边

底色为容器白，边框与文字同色、同状态 token：

| theme | normal | hover | active | disabled |
|---|---|---|---|---|
| `primary` | 底 `bg-color-container`，边框 + 字 `brand-color` | 底 `bg-color-component`，边框 + 字 `brand-color-hover` | 底 `component-stroke` `#dfe1e8`，边框 + 字 `brand-color-active` | 底 `bg-color-container`，边框 + 字 `brand-color-disabled` |
| `default` | 底 `bg-color-container`，边框 `component-border`，字 `text-color-primary` | 同 primary 的底色规律（`bg-color-component`），边框/字取 default 主题对应状态色 | 同上（`component-stroke`） | 边框 + 字降为禁用色 |
| `danger` | 底 `bg-color-container`，边框 + 字 `error-color` | 底 `bg-color-component`，边框 + 字 `error-color-hover` | 底 `component-stroke`，边框 + 字 `error-color-active` | 边框 + 字 `error-color-disabled` |

边框：`1px solid`。

> 逐项读取覆盖了 outline/primary 的四个状态与 outline/default、outline/danger 的 normal；default 与 danger 的 hover / active / disabled 按同一状态 token 规律填写（底色走 `bg-color-component` → `component-stroke`，边框与文字走各主题的 hover / active / disabled 色）。实现前如需 100% 逐格确认，可再读对应变体。

## 配色规范 — dash 虚边

与 outline 完全一致，只把边框改成 `1px dashed`。已验证 dash/primary/normal：底 `bg-color-container`，边框 `brand-color` 虚线，字 `text-color-brand`。

## 配色规范 — text 文字

无边框：

| 状态 | 背景 | 文字 |
|---|---|---|
| normal | 无（透明） | 主题色（primary → `text-color-brand`） |
| hover | `bg-color-component` `#f2f4f7` | `brand-color-hover`（danger → `error-color-hover`） |
| active | `component-stroke`（与 outline 同规律） | `brand-color-active` |
| disabled | 无（透明） | `brand-color-disabled` |

保留 `radius-default 4px`（hover 底色需要圆角）。

## 配色规范 — ghost 幽灵

无背景，`1px solid` 边框与文字同色，用于图片 / 深色背景之上：

| theme | normal | hover | active | disabled |
|---|---|---|---|---|
| `default` | 边框 + 字 `text-color-white` | 白色系对应 hover 表现 | — | 边框 + 字 `text-color-secondary` `#676a72` |
| `primary` | 边框 + 字 `brand-color` | 边框 + 字 `brand-color-hover` | 边框 + 字 `brand-color-active` | 边框 + 字 `text-color-secondary` |
| `danger` | 边框 + 字 `error-color` | 边框 + 字 `error-color-hover` | 边框 + 字 `error-color-active` | 边框 + 字 `text-color-secondary` |

> ghost 的禁用态用 `text-color-secondary`，**不是** `brand-color-disabled`（已在 ghost/primary/disabled 变体上确认），不要按其他类型的规律推。

## Icon 规范

| iconType | 结构 | 说明 |
|---|---|---|
| `prefixIcon 前置图标` | icon + gap + 文字 | Figma 默认实例 `download` |
| `suffixIcon 后置图标` | 文字 + gap + icon | Figma 默认实例 `chevron-down` |
| `singleIcon 独立图标` | 仅 icon，绝对居中 | Figma 默认实例 `search`，配合 `square` / `circle` |

- icon 尺寸与 gap 见「尺寸规范」表（14/4、16/8、18/12）
- icon 颜色跟随文字色，实现时用 `fill="currentColor"`
- icon 必须从 Icon 库（文件 `vuD3onrb6PS5UtMrGdgbrA`，Icon 页 `192:1494`）取真实 SVG path 内联
- Figma 中 suffix 的 `chevron-down` 实例外框是 `16.92 × 15.38`，未对齐 16 网格；实现时按 16×16 处理

## Loading 态

示例页 `Loading 样式` 区块用 **Loading 组件作为前置图标**（16px，medium 尺寸）：

| 按钮底色 | Loading 主题 |
|---|---|
| 实底（base primary / danger 等） | `loading-white` |
| 浅底 / 描边 / 文字按钮 | `loading-blue` |

Loading 组件规范见 `custom-components.md` 的 Loading 章节。加载中按钮不可点击，文字可替换为「加载」等提示。

## Block 按钮

示例页的 Block 按钮是把按钮宽度撑满容器（示例为 320px 宽实例），组件集里**没有**对应变体。实现用 TDesign 的 `block` prop 或 `width: 100%`。

## 实现要点

1. 用 `t-button` 承载，props 对应关系：
   - `variant`：`base` / `outline` / `dashed`（对应 Figma `dash 虚边按钮`）/ `text`
   - `ghost`：对应 Figma `ghost 幽灵按钮`（TDesign 里 ghost 是布尔 prop，不是 variant）
   - `theme`：`default` / `primary` / `danger`
   - `size`：`small` / `medium` / `large`
   - `shape`：`rectangle` / `square` / `round` / `circle`
   - `disabled`、`loading`、`block`
   - 前后置图标用 `icon` / `suffix` 插槽
2. **`Secondary 次要` 主题 TDesign 没有对应值**：用 `variant="base"` 再叠一个自定义 class 实现（底 `brand-color-light`、字 `text-color-brand`，状态色见配色表）。不要用含义相近的 TDesign 主题凑（如 `theme="primary" variant="outline"`），那是另一套视觉。
3. 视觉覆盖优先改全局 `:root` 里的 TDesign CSS 变量；局部覆盖再用 `:deep()`，且只覆盖本文档列出的属性
4. 字号 / 行高照抄，字体不声明（`font-family: inherit`），Figma 标注的 `PingFang SC` 不写进代码
5. 描边类按钮加 `box-sizing: border-box`，保证 24 / 32 / 40 的固定高度

## 不可随意修改的部分

- 三档尺寸的高度与内边距：24 / `2px 8px`、32 / `5px 16px`、40 / `8px 24px`
- 三档 icon 尺寸与 gap：14/4、16/8、18/12
- `square` / `circle` 必须是正方形，边长等于对应尺寸的高度
- 全圆角一律 `var(--radius-circle)`，不写 `50%`、不照抄 `128px`
- 各类型的状态色 token 归属（尤其 outline / text 的 hover 底色是 `bg-color-component`、active 底色是 `component-stroke`，不是品牌色浅色）
- ghost 禁用色是 `text-color-secondary`
- base 类型无边框；ghost / text 类型无背景（text 仅 hover / active 有底色）

## 设计稿命名例外（照原样记录，不在 Figma 里改）

- `base / primary / disabled` 的文字变量是 `Color/text/text_white`，其他位置都是 `text/text-color-white`，值同为白色
- 全圆角变量是 `radius/radius_full`（`128px`），与 China Token 的 `radius-circle` 对应
- `theme` 变体值里只有 `Secondary 次要` 是大写开头，其余 `default` / `primary` / `danger` 小写
