# Tabs 选项卡（Web）

## 概述

**Figma 来源**：文件 `b5cc1y3jzLmOQkpa8vz5AX`（China Design system for web），页面 node-id `35336:295539`（`Tabs 选项卡 ✅`）

| 组件集 | node-id |
|---|---|
| `normalTabs 选项卡-默认主题` | `35336:308101` |
| `cardTabs 选项卡-卡片主题` | `35336:296666` |
| `Tabs-demo 选项卡示例`（设计示例页） | `35336:319495` |

子组件（item 级组件集，容器由它们拼装）：

| 子组件 | top / m | top / l | left / m | left / l |
|---|---|---|---|---|
| `item/normalTabs` | `35336:295706` | `35336:295747` | `35336:295870` | `35336:295911` |
| `item/cardTabs` | `35336:296338` | `35336:296379` | `35336:296502` | `35336:296543` |

操作按钮（增减 / 滑动）：`item/normalOperate/{right,left,top,bottom}/{m,l}`、`item/cardOperate/{right,left,top,bottom}/{m,l}`，如 `item/normalOperate/right/m` = `35336:296034`。

**适用场景**：同一层级下不同页面或类别的内容切换。

**TDesign 对应**：`t-tabs` + `t-tab-panel`（Web 端优先用 TDesign 承载结构与交互，只覆盖视觉）。

## 变体矩阵

| 维度 | Figma 变体名 | 取值 |
|---|---|---|
| 主题 | 组件集区分 | `normalTabs 默认主题` / `cardTabs 卡片主题` |
| 位置 | `placement 位置` | `top 顶部` / `left 左`（左侧仅提供 8 items） |
| 尺寸 | `size 尺寸` | `medium 中尺寸`（48px）/ `large 大尺寸`（64px） |
| 数量 | `items 数量` | 2 ~ 8 |
| 图标 | `icon 图标` | true / false（文字前置 icon） |
| 增加 | `add 添加选项卡` | true / false |
| 删除 | `⬑removable 删除` | true / false（与 add 同时开启） |
| 滑动 | `chevron 滑动` | true / false（超宽时两端出现翻页按钮） |
| item 状态 | `state 状态` + `disabled 禁用` | normal / hover / active / select / disabled |

> `add` 与 `removable` 在 Figma 中成对出现（增减选项卡场景）。左侧位置只做了 8 items 的变体。

## Token 映射

| Figma 变量 | 项目 CSS variable | 色值 |
|---|---|---|
| `Color/brand/brand-color` | `--brand-color` | `#1450f5` |
| `Color/grey/bg-color-container` | `--bg-color-container` | `#ffffff` |
| `Color/grey/bg-color-component` | `--bg-color-component` | `#f2f4f7` |
| `Color/grey/bg-color-component-disabled` | `--bg-color-component-disabled` | `#f2f4f7` |
| `Color/grey/component-stroke` | `--component-stroke` | `#dfe1e8` |
| `Color/grey/component-border` | `--component-border` | `#c8cad0` |
| `text/text-color-secondary` | `--text-color-secondary` | `#676a72` |
| `text/text-color-disabled` | `--text-color-disabled` | `#abadb2` |
| `radius/radius-medium` | `--radius-medium` | `6px` |

## 结构

```
Tabs（容器：flex，overflow: hidden）
├── operate（可选，前置：chevron-left 或 add）
├── TabItem × N   ← item 之间无 gap，间距由 item 自身内边距构成
└── operate（可选，后置：chevron-right 或 add）

TabItem（默认主题）
└── wrapper（padding 8px，select 时底部/右侧 3px 品牌色指示条）
    └── content（hover / active 时出现底色 + radius-medium）
        ├── prefixIcon（icon=true）
        ├── label
        └── close（removable=true）

TabItem（卡片主题）
└── item（无 wrapper 层，底色直接画在 item 上，右侧 1px 分隔线）
    ├── prefixIcon（icon=true）
    ├── label
    └── close（removable=true）
```

## 容器规范

| 主题 | 位置 | 背景 | 边线 | 布局 |
|---|---|---|---|---|
| 默认 | top | `bg-color-container` `#ffffff` | 底部 `1px` `component-stroke` | `flex`，`align-items: flex-start`，`overflow: hidden` |
| 默认 | left | `bg-color-container` `#ffffff` | 右侧 `1px` `component-stroke` | `flex-column`，item 撑满容器宽 |
| 卡片 | top | `bg-color-component` `#f2f4f7` | 底部 `1px` `component-stroke` | 同默认 top |
| 卡片 | left | `bg-color-component` `#f2f4f7` | 右侧 `1px` `component-stroke` | 同默认 left |

左侧位置容器宽度（Figma 标注）：medium `160px`、large `200px`。

## Item 规范 — 默认主题

| 属性 | medium | large |
|---|---|---|
| 高度 | `48px` | `64px` |
| wrapper padding | `8px` 四边 | `8px` 四边 |
| content padding | `5px 8px` | `12px 16px` |
| 字号 / 行高 | `14px / 22px`（Body 14/Regular） | `16px / 24px`（H7 16/Regular） |
| 字重 | `400` | `400` |
| icon 尺寸 | `16px` | `18px` |
| close 尺寸 | `16px` | `18px` |
| gap（icon ↔ 文字） | `8px` | `8px` |
| gap（文字块 ↔ close） | `8px` | `16px` |
| content 圆角 | 常态 `3px`，hover / active `radius-medium 6px` | 同 medium |
| 选中指示条 | top 位置：底部 `3px` `brand-color`；left 位置：右侧 `3px` `brand-color` | 同 medium |

**默认主题状态色**

| 状态 | content 背景 | 文字 / icon 颜色 |
|---|---|---|
| normal | 透明（同容器 `bg-color-container`） | `text-color-secondary` `#676a72` |
| hover | `bg-color-component` `#f2f4f7` | `text-color-secondary` |
| active（按下） | `component-stroke` `#dfe1e8` | `text-color-secondary` |
| select（选中） | 透明 | `brand-color` `#1450f5` + 3px 指示条 |
| disabled | 透明，无 hover / active 反馈 | `text-color-disabled` `#abadb2`，**不显示指示条** |

> Figma 里禁用态是画在 `state=select 选中, disabled=true` 变体上的。medium 变体的禁用文字仍取品牌色，large 变体取 `text-color-disabled`——这是设计稿内部不一致，**实现以 large 为准（禁用一律 `text-color-disabled`）**。

## Item 规范 — 卡片主题

| 属性 | medium | large |
|---|---|---|
| 高度 | `48px` | `64px` |
| item padding | `13px 16px` | `20px 24px` |
| 字号 / 行高 | `14px / 22px` | `16px / 24px` |
| icon / close 尺寸 | `16px` | `18px` |
| gap（icon ↔ 文字） | `8px` | `8px` |
| gap（文字块 ↔ close） | `8px` | `16px` |
| 分隔线 | top 位置：右侧 `1px` `component-stroke`；left 位置：底部 `1px` `component-stroke` | 同 medium |
| 圆角 | 无（卡片主题 item 为直角） | 无 |

> `13px` / `20px` 的纵向内边距是为凑 48 / 64 固定高度反推出来的，照抄即可。

**卡片主题状态色**

| 状态 | item 背景 | 文字 / icon 颜色 |
|---|---|---|
| normal | `bg-color-component` `#f2f4f7` | `text-color-secondary` `#676a72` |
| hover | `bg-color-component-disabled` `#f2f4f7` | `text-color-secondary` |
| active（按下） | `component-border` `#c8cad0` | `text-color-secondary` |
| select（选中） | `bg-color-container` `#ffffff` | `brand-color` `#1450f5` |
| disabled | `bg-color-component` `#f2f4f7` | `text-color-disabled` `#abadb2` |

> 卡片主题**没有**底部指示条，选中靠「白底 + 品牌色文字」表达。hover 与 normal 的 Token 名不同（`bg-color-component-disabled` vs `bg-color-component`）但当前色值相同，均为 `#f2f4f7`；按 Token 名实现，不要合并。
> 卡片主题的禁用态画在 `state=normal 默认, disabled=true` 变体上，即禁用项不参与选中态。

## 操作按钮（增减 / 滑动）

| 属性 | medium | large |
|---|---|---|
| 尺寸 | `40 × 48px` | `48 × 64px` |
| icon 尺寸 | `16px` | `18px` |
| 文字模式字号 | `14px / 22px` | `16px / 24px` |
| 对齐 | `flex`，水平垂直居中 | 同 |

- 分隔线画在**朝向 item 列表的那一侧**：`right` 变体 → `border-left`，`left` 变体 → `border-right`，`bottom` 变体 → `border-top`，`top` 变体 → `border-bottom`；线宽 `1px`，颜色 `component-stroke`
- `chevron=false` → 显示 `add` 图标（新增选项卡）；`chevron=true` → 显示 `chevron-left` / `chevron-right`（滑动翻页）
- `text=true` → 用文字（示例文案「操作」）替代图标，此时不带 chevron
- 背景：
  - 默认主题：normal `bg-color-container` `#ffffff`，hover `bg-color-component` `#f2f4f7`
  - 卡片主题：normal `bg-color-component` `#f2f4f7`，hover `bg-color-component-disabled` `#f2f4f7`
- 禁用：图标 / 文字取 `text-color-disabled` `#abadb2`，无 hover 反馈
- 操作按钮只有 `normal` / `hover` 两个交互状态，没有 active 态

## Icon 清单

| 用途 | icon | 尺寸 |
|---|---|---|
| item 前置图标 | 占位（业务自定，通过 slot / prop 传入） | 16（m）/ 18（l） |
| item 删除 | `close-M` | 16（m）/ 18（l） |
| 新增选项卡 | `add` | 16（m）/ 18（l） |
| 向前滑动 | `chevron-left` | 16（m）/ 18（l） |
| 向后滑动 | `chevron-right` | 16（m）/ 18（l） |

实现时用 `get_design_context` 从 Icon 库（文件 `vuD3onrb6PS5UtMrGdgbrA`，Icon 页 `192:1494`）读取真实 SVG path 内联，`fill="currentColor"`，颜色随文字状态变化。

## 实现要点

1. 用 `t-tabs` + `t-tab-panel` 承载，props 对应关系：
   - `theme`：`normal` ↔ 默认主题，`card` ↔ 卡片主题
   - `placement`：`top` / `left`
   - `size`：`medium` / `large`
   - `addable`：对应 `add 添加选项卡`
   - `t-tab-panel` 的 `removable`：对应 `⬑removable 删除`
   - `disabled`：单个 panel 禁用
   - 溢出滑动由 TDesign 自带的滚动按钮承担，对应 `chevron 滑动`
2. 视觉覆盖优先改全局 `:root` 里的 TDesign CSS 变量；确实需要局部覆盖时再用 `:deep()`，并只覆盖本表格列出的属性
3. 指示条只在默认主题出现，且 `disabled` 时不显示
4. 容器必须 `overflow: hidden`，item 不设 gap（间距全部来自 item 内边距），否则 top 位置的底边线会断开
5. 左侧位置（`placement=left`）设计上只给到 8 项，超过 8 项需要滑动或改用 top 位置
6. 图标颜色不单独写死，跟随文字色（`currentColor`）

## 不可随意修改的部分

- item 固定高度 48 / 64px 与对应内边距（来自 Figma 精确标注）
- 默认主题选中指示条：`3px`、`brand-color`、top 位置在底部 / left 位置在右侧
- 卡片主题的选中表达方式（白底 + 品牌色文字，无指示条）
- 卡片主题 item 之间的 `1px` `component-stroke` 分隔线，以及容器底部（left 位置为右侧）的 `1px` 边线
- 状态色的 Token 归属（尤其 active 用 `component-stroke` / `component-border`，不要换成品牌色）
- 字号 / 行高组合：medium `14/22`，large `16/24`
