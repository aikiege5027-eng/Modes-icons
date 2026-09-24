# Search 搜索（Web）

## 概述

**Figma 来源**：文件 `b5cc1y3jzLmOQkpa8vz5AX`（China Design system for web），页面 node-id `72086:226133`（`Search 搜索 ✅`）

| 内容 | node-id |
|---|---|
| `Search` 组件集 | `78092:236156` |
| `item/searchBox` 子组件集（搜索按钮） | `78092:236261` |
| `item/searchPopup` 子组件集（下拉面板） | `78092:236130` |
| `search-demo 搜索示例`（设计示例页） | `78840:236512` |

**适用场景**：带搜索按钮的输入框，用于内容检索。

**TDesign 对应**：TDesign 没有独立的 Search 组件，用 `t-input`（基础/清空/无边框）、`t-auto-complete`（联想/历史/自定义面板）、`t-textarea` 或 `t-input` 多行（批量搜索）组合实现。

## 变体矩阵

| 维度 | Figma 变体名 | 取值 |
|---|---|---|
| 无边框 | `borderless 无边框` | false / true |
| 前置搜索按钮 | `prefix 前缀` | false / true |
| 后置搜索按钮 | `suffix 后缀` | false / true |
| 已输入 | `fill 填充` | false（未输入，显示 placeholder）/ true（已输入） |
| 状态 | `state 状态` | `normal 默认` / `hover 悬浮` / `focus 聚集` |
| 一键清空 | `clearable清空空` | false / true |
| 批量搜索 | `multiline 批量搜索` | false / true |
| 联想面板 | `popup 联想` | false / true |
| 禁用 | `disabled 禁用` | false / true |

示例页覆盖的业务场景：基础搜索框、无边框搜索框、带一键清空、批量搜索、带联想、可自定义展开内容、带历史记录。

## Token 映射

| Figma 变量 | 项目 CSS variable | 色值 |
|---|---|---|
| `Color/grey/bg-color-container` | `--bg-color-container` | `#ffffff` |
| `Color/grey/bg-color-secondarycontainer` | `--bg-color-secondarycontainer` | `#f5f7fa` |
| `Color/grey/bg-color-component-disabled` | `--bg-color-component-disabled` | `#f2f4f7` |
| `Color/grey/component-border` | `--component-border` | `#c8cad0` |
| `Color/brand/brand-color` | `--brand-color` | `#1450f5` |
| `Color/brand/brand-color-hover` | `--brand-color-hover` | `#4373f7` |
| `Color/brand/brand-color-focus` | `--brand-color-focus` | `#d0dcfd` |
| `text/text-color-primary` | `--text-color-primary` | `#141414` |
| `text/text-color-secondary` | `--text-color-secondary` | `#676a72` |
| `text/text-color-placeholder` | `--text-color-placeholder` | `#8f9195` |
| `text/text-color-disabled` | `--text-color-disabled` | `#abadb2` |
| `radius/radius-default` | `--radius-default` | `4px` |
| `radius/radius-medium` | `--radius-medium` | `6px` |

**效果样式**

| Figma 效果样式 | CSS |
|---|---|
| `Light/Focus Shadow/Default` | `box-shadow: 0 0 0 2px var(--brand-color-focus)` |
| `Light/Shadow/2` | `box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1)` |

## 结构

```
Search
├── searchBox（prefix=true 时在左）      ← item/searchBox 子组件
├── content（输入区，flex: 1）
│   └── placeholder / 已输入文字 / 光标
├── close-circle-filled（clearable=true，绝对定位在右）
├── searchBox（suffix=true 时在右）
└── item/searchPopup（popup=true，绝对定位在输入框下方）
```

## 容器规范

| 属性 | 值 |
|---|---|
| 宽度 | 示例 `240px`，实际自适应容器 |
| 高度 | `32px`（`multiline` 聚焦时 `120px`） |
| 圆角 | `radius-default 4px` |
| 背景 | `bg-color-container` |
| 边框 | `1px solid`，颜色随状态 |
| gap | `8px` |
| 内边距（prefix 在左） | `4px 8px 4px 4px` |
| 内边距（suffix 在右） | `4px 4px 4px 8px` |
| 文字 | `14px / 22px`（Body 14/Regular），字重 `400` |

内边距是不对称的：**搜索按钮那一侧留 4px，纯文字那一侧留 8px**，因为按钮自身还有 4px 横向内边距。

## 状态规范（有边框）

| 状态 | 边框 | 背景 | 文字 | 其他 |
|---|---|---|---|---|
| normal（未输入） | `component-border` `#c8cad0` | `bg-color-container` | placeholder `text-color-placeholder` | — |
| hover | `brand-color-hover` `#4373f7` | `bg-color-container` | placeholder 色不变 | 内部 searchBox 出现底色 `bg-color-secondarycontainer` |
| focus | `brand-color` `#1450f5` | `bg-color-container` | `text-color-primary` | focus ring `0 0 0 2px brand-color-focus` |
| fill=true（已输入） | 随所处状态 | 随所处状态 | `text-color-primary` | — |
| disabled | `component-border` | `bg-color-component-disabled` `#f2f4f7` | `text-color-disabled` `#abadb2` | 搜索按钮 icon 同步置灰 |

## 状态规范（borderless 无边框）

| 状态 | 表现 |
|---|---|
| normal | 无边框，底 `bg-color-container`，圆角 `3px`（设计稿写死值） |
| hover | **出现** `1px solid component-border` 边框 + 底色 `bg-color-secondarycontainer`；此时内部 searchBox 不加底色 |
| focus | 与有边框 focus 一致：边框 `brand-color` + focus ring（设计稿此处 ring 色写死 `#d9e1ff`，实现统一用 `brand-color-focus`） |
| disabled | 无边框，底 `bg-color-component-disabled`，文字 `text-color-disabled` |

> 「无边框」只描述常态，hover / focus 仍会出现边框，这是设计意图，不要把边框整体去掉。

## 一键清空（clearable）

- 图标：`close-circle-filled`，`16 × 16`
- 位置：绝对定位，`right: 7px`，垂直居中（`top: 50%` + `translateY(-50%)`）
- 仅在 `fill=true`（有内容）时出现

## 批量搜索（multiline）

| 状态 | 高度 | 对齐 |
|---|---|---|
| normal / hover | `32px` | 垂直居中 |
| focus | `120px` | `align-items: flex-start`，纵向内边距 `4px` |

搜索按钮在多行状态下**不随容器拉伸**，保持 `24px` 高并顶部对齐。

## 联想 / 历史面板（item/searchPopup）

**面板容器**

| 属性 | 值 |
|---|---|
| 定位 | 绝对定位，`top: 39px`（32 输入框 + 1 边框 + 6 间距），`left: -1px`、`right: -1px`（与输入框外边缘对齐） |
| 背景 | `bg-color-container` |
| 圆角 | `radius-medium 6px` |
| 内边距 | `6px` |
| 阴影 | `Light/Shadow/2` → `0 4px 10px rgba(0,0,0,0.1)` |
| 选项间 gap | `2px` |

**选项行**：内边距 `3px 8px`，文字 `14px / 22px`，颜色 `text-color-primary`。

**两种面板变体**

| 变体 | 结构 |
|---|---|
| `mind=true, history=false`（联想） | 纯选项列表，命中的关键词片段用品牌色 `#1450f5` 高亮，其余文字用 `text-color-primary` |
| `mind=false, history=true`（历史记录） | 分组：组标题「历史记录」`12px / 20px`、`text-color-placeholder`，右侧接一条分割线；组内选项 gap `4px`，组之间 gap `2px` |

> 联想高亮在设计稿里写死 `#1450f5`，实现时用 `var(--brand-color)`。

## 搜索按钮（item/searchBox）

| 属性 | 值 |
|---|---|
| 高度 | `24px` |
| 内边距 | `0 4px` |
| 圆角 | `2px` |
| gap（icon + label） | `4px` |
| icon 尺寸 | `16px` |
| 文字 | `14px / 22px`，`text-color-secondary` `#676a72`（默认文案「搜索」） |

**三种内容形态**：`icon only` / `label only` / `icon + label`。

| 状态 | 背景 | 文字 |
|---|---|---|
| normal | 无 | `text-color-secondary` |
| hover | `bg-color-secondarycontainer` `#f5f7fa` | `text-color-secondary` |
| disabled | 无 | `text-color-disabled` `#abadb2`，icon 同步置灰 |

## Icon 清单

| 用途 | icon | 尺寸 |
|---|---|---|
| 搜索按钮 | `search` | 16px |
| 一键清空 | `close-circle-filled` | 16px |

从 Icon 库（文件 `vuD3onrb6PS5UtMrGdgbrA`，Icon 页 `192:1494`）取真实 SVG path 内联，`fill="currentColor"`。

## 实现要点

1. 组件组合建议：
   - 基础 / 无边框 / 一键清空 → `t-input`（`clearable`、`borderless`），搜索按钮放 `prefix-icon` / `suffix` 插槽
   - 联想、历史记录、自定义展开内容 → `t-auto-complete`，面板用 panel 类插槽自绘，样式照「联想 / 历史面板」表
   - 批量搜索 → 多行输入（`t-textarea` 或 `t-input` 多行），聚焦时高度 120px
2. 搜索按钮是**独立可点区域**，不要做成纯装饰 icon；它有自己的 hover / disabled 态和 `2px` 圆角底色
3. focus ring 用 `box-shadow`（不占布局）而不是加粗边框，否则 32px 高度会被撑开
4. 面板宽度用 `left: -1px; right: -1px` 对齐输入框外沿，不要写死 240px
5. 字号 / 行高照抄，字体不声明（`font-family: inherit`）
6. `disabled` 时容器、文字、搜索按钮 icon 三者同时置灰

## 不可随意修改的部分

- 单行高度 `32px`、批量搜索聚焦高度 `120px`
- 不对称内边距：按钮侧 `4px`、文字侧 `8px`
- hover 用 `brand-color-hover` 边框、focus 用 `brand-color` 边框 + `2px` focus ring
- 无边框变体在 hover / focus 时会出现边框
- 面板 `top: 39px`、内边距 `6px`、圆角 `radius-medium`、阴影 `Light/Shadow/2`
- 搜索按钮 `24px` 高、`2px` 圆角、hover 底色 `bg-color-secondarycontainer`

## 设计稿不一致（照原样记录，不在 Figma 里改，实现时按下方口径统一）

1. **focus ring 色不统一**：有边框 focus 用 token `brand-color-focus`（`#d0dcfd`），无边框 focus 写死 `#d9e1ff`。实现统一用 token。
2. **focus ring 缺失**：部分 focus 变体（如 `78092:236213` clearable + focus）没有画 ring，而 `78092:236165`、`78092:236225` 有。实现统一：所有 focus 态都加 ring。
3. **圆角写死 3px**：`borderless / normal`（`78092:236159`）与 popup 变体的内层 `searchInput`（`78712:238845`）用 `3px`，其余用 `radius-default 4px`。实现统一用 `radius-default`。
4. **popup 变体外层多一层边框**：`78092:236169` 的最外层 wrapper 带了 `1px component-border`，而内层 `searchInput` 已有 focus 边框。实现时外层只作定位容器，不画边框。
5. **变体属性与图层不一致**：`fill=true` 且 `prefix=false, suffix=false` 的变体（如 `78092:236209`、`78092:236213`）左侧仍然渲染了搜索按钮。实现按「至少有一个搜索按钮，位置由 prefix / suffix 决定」处理。
6. **变体名错别字**：状态值是 `focus 聚集`（应为「聚焦」）、清空是 `clearable清空空`（多一个「空」字且缺空格）。保持 Figma 原样，不改名。
