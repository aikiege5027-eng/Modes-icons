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

示例页覆盖的业务场景：基础搜索框、无边框搜索框、带一键清空、批量搜索（含标签形态）、带联想、可自定义展开内容、带历史记录；「组件状态」区另有一个「搜索区域交互事件」示例（`79728:236726`，见搜索按钮一节）。

### 变体覆盖范围（组件集实际画了哪些组合）

组件集按 5 列 × 12 行排布（列：`prefix` / `suffix` / `multiline` / `borderless-prefix` / `borderless-suffix`）。并不是所有属性组合都有画，实现时以下列覆盖为准：

| 行（Figma 标注） | 含义 | 画了的列 |
|---|---|---|
| 未输入-default / hover / focus | `fill=false`，三种交互态 | 5 列都有 |
| 正在输入 & popup | `fill=false, state=focus, popup=true`（输入中、出联想） | 5 列都有 |
| 正在输入 & popup & clearable | 同上 + `clearable=true` | 5 列都有 |
| 未输入-disabled | `fill=false, state=normal, disabled=true` | 5 列都有 |
| 已输入-filled / filled & hover | `fill=true`，normal / hover | **只有 `prefix=false`**（suffix、无按钮两类）+ multiline |
| filled & popup | `fill=true, focus, popup=true` | 同上 |
| 正在输入 & popup & clearable（已输入区） | `fill=true, focus, popup=true, clearable=true` | 同上 |
| 已输入 & clearable | `fill=true, focus, clearable=true` | 同上 |
| 已输入 & disabled | `fill=true, disabled=true`（变体名里 `state=focus`，见不一致第 7 条） | 5 列都有 |

- `multiline 批量搜索=true` 只画了 **有边框 + suffix** 一种组合（无 prefix、无 borderless）
- `fill=true` 且 `prefix=true` 的非禁用变体没有画：已输入后搜索按钮的位置按 prefix / suffix 原样保留即可，样式与 suffix 列一致

## Token 映射

| Figma 变量 | 项目 CSS variable | 色值 |
|---|---|---|
| `Color/grey/bg-color-container` | `--bg-color-container` | `#ffffff` |
| `Color/grey/bg-color-secondarycontainer` | `--bg-color-secondarycontainer` | `#f5f7fa` |
| `Color/grey/bg-color-component-disabled` | `--bg-color-component-disabled` | `#f2f4f7` |
| `Color/grey/component-border` | `--component-border` | `#c8cad0` |
| `Color/grey/component-stroke` | `--component-stroke` | `#dfe1e8`（历史记录分割线、批量搜索标签底色） |
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
| focus | `brand-color` `#1450f5` | `bg-color-container` | `text-color-primary` | focus ring `0 0 0 2px brand-color-focus`；**未输入时设计稿只画光标、不显示 placeholder**（`78092:236165`） |
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

- 图标：`close-circle-filled`，`16 × 16`，颜色 `text-color-placeholder` `#8f9195`
- 出现条件：输入框里**有内容**时出现 —— 包括已输入（`fill=true`）和正在输入（`fill=false, focus, popup=true`，如 `78746:238180`）两种；空输入框不出现
- 位置：绝对定位、垂直居中（`top: 50%` + `translateY(-50%)`），横向随搜索按钮位置变：

| 搜索按钮位置 | `right` | 来历 |
|---|---|---|
| prefix（按钮在左，右侧是文字） | `7px` | `78746:238180` |
| suffix（按钮在右） | `35px` | `4px` 右内边距 + `24px` 按钮 + `7px`（`78092:236201`） |
| multiline（suffix，120px 高） | `35px`，纵向对齐**第一行**（`top: calc(50% - 44px)` = 中心距顶 16px） | `78746:238204` |

- 清空图标与文字之间没有额外留白，长文本会被它压住：实现时给输入区补右内边距 `16px + 8px gap`，避免文字和图标重叠

## 批量搜索（multiline）

| 状态 | 高度 | 对齐 |
|---|---|---|
| normal / hover | `32px` | 垂直居中 |
| focus | `120px` | `align-items: flex-start`，纵向内边距 `4px` |

搜索按钮在多行状态下**不随容器拉伸**，保持 `24px` 高并顶部对齐。

- 输入区 `content` 在 focus 态高 `112px`（120 − 上下各 4px），多行文字按 `14px / 22px` 逐行排
- 多行 + 联想：面板 `top: 127px`（120 输入框 + 1 边框 + 6 间距）

### 批量搜索 · 标签形态（示例页 `78842:236991`）

示例页「批量搜索框」第三个实例把多个关键词显示成标签，组件集里没有对应变体，规格按示例页读数：

| 部位 | 值 |
|---|---|
| 容器 | 高 `32px`，内边距四边 `4px`（不是 8/4 的不对称值），边框 `component-border`，其余同单行 |
| 标签区 | `flex: 1`，横向排、`overflow: hidden`（放不下的标签被裁掉，不换行），标签间 gap `4px` |
| 单个标签 | 底色 `component-stroke` `#dfe1e8`，内边距 `2px 8px`，圆角 `3px`（设计稿写死），文字与关闭按钮 gap `8px` |
| 标签文字 | `12px / 20px`（Foot 12/Regular），`text-color-primary` |
| 关闭按钮 | `close` 图标 `14 × 14`，颜色 `text-color-placeholder` `#8f9195` |

实现建议用 TDesign `t-tag-input`（`excess-tags-display-type="scroll"` 不换行），标签样式按上表覆盖。

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

**历史记录组标题行**：横向排，内边距 `0 8px`（与选项文字左对齐），标题与分割线 gap `8px`；分割线 `1px`、`flex: 1`，颜色 `component-stroke` `#dfe1e8`。

**示例页里的三种面板用法**

| 场景 | 示例节点 | 面板内容 |
|---|---|---|
| 带联想 | `79740:236742` | 联想面板，命中片段品牌色高亮 |
| 可自定义展开内容 | `78842:237009` | 结构同联想面板，但**不做关键词高亮**，选项整行 `text-color-primary` —— 展开内容由业务自定义，不一定是匹配结果 |
| 带历史记录 | `78842:237027`（未输入）/ `78842:237062`（正在输入） | 未输入：只列历史记录；正在输入：仍按历史分组展示，组内与输入匹配的选项把命中片段高亮 |

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

**三种内容形态**（宽度由内容决定）：

| 形态 | 宽度 | 节点（normal） |
|---|---|---|
| `icon only` | `24px` | `78092:236267` |
| `label only` | `36px` | `78092:236265` |
| `icon + label` | `56px` | `78092:236262` |

| 状态 | 背景 | 文字 | icon |
|---|---|---|---|
| normal | 无 | `text-color-secondary` | `text-color-secondary` `#676a72` |
| hover | `bg-color-secondarycontainer` `#f5f7fa` | `text-color-secondary` | 同 normal |
| disabled | 无 | `text-color-disabled` `#abadb2` | `text-color-disabled` `#abadb2` |

**hover 的触发范围**：「组件状态 · 搜索区域交互事件」示例（`79728:236726`）表明，鼠标悬停在**整个输入框**上时，输入框边框变 `brand-color-hover`，同时搜索按钮出现 hover 底色 —— 不是只有指针压在按钮上才变。无边框变体例外：容器 hover 时按钮不加底色（见上方无边框状态表）。

## Icon 清单

| 用途 | icon | 尺寸 | 颜色 |
|---|---|---|---|
| 搜索按钮 | `search` | 16px | `text-color-secondary`，禁用 `text-color-disabled` |
| 一键清空 | `close-circle-filled` | 16px | `text-color-placeholder` |
| 批量搜索标签的关闭 | `close`（`item/tag-closeBtn`） | 14px | `text-color-placeholder` |

从 Icon 库（文件 `vuD3onrb6PS5UtMrGdgbrA`，Icon 页 `192:1494`）取真实 SVG path 内联，`fill="currentColor"`。下面是本组件导出里的原始 path（原 fill 为上表色值，已换成 `currentColor`），可直接内联：

```html
<!-- search · viewBox 0 0 16 16 -->
<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M9.51033 10.2186C8.69189 10.8814 7.64943 11.2784 6.51424 11.2784C3.88302 11.2784 1.75 9.14541 1.75 6.51421C1.75 3.88301 3.88302 1.75 6.51424 1.75C9.14545 1.75 11.2785 3.88301 11.2785 6.51421C11.2785 7.64942 10.8814 8.69189 10.2186 9.51034L13.75 13.0417L13.0417 13.75L9.51033 10.2186ZM10.2768 6.51421C10.2768 4.43623 8.59224 2.75168 6.51424 2.75168C4.43623 2.75168 2.75168 4.43623 2.75168 6.51421C2.75168 8.59219 4.43623 10.2767 6.51424 10.2767C8.59224 10.2767 10.2768 8.59219 10.2768 6.51421Z" fill="currentColor"/></svg>

<!-- close-circle-filled · viewBox 0 0 16 16 -->
<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M15 8C15 4.13401 11.866 1 8 1C4.13401 0.999998 1 4.134 1 8C0.999998 11.866 4.134 15 8 15C11.866 15 15 11.866 15 8ZM5.67091 4.94754L8.00001 7.29075L10.3291 4.94754L11.0384 5.65251L8.70499 8L11.0383 10.3475L10.3291 11.0525L8.00001 8.70925L5.67092 11.0525L4.96168 10.3475L7.29503 8L4.96167 5.65251L5.67091 4.94754Z" fill="currentColor"/></svg>

<!-- close（标签关闭）· viewBox 0 0 14 14 -->
<svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true"><path d="M6.99999 7.80432L9.6914 10.4957L10.4957 9.6914L7.80432 6.99999L10.4957 4.30858L9.6914 3.50424L6.99999 6.19566L4.30855 3.50422L3.50422 4.30855L6.19566 6.99999L3.50422 9.69143L4.30855 10.4958L6.99999 7.80432Z" fill="currentColor"/></svg>
```

## 实现要点

1. 组件组合建议：
   - 基础 / 无边框 / 一键清空 → `t-input`（`clearable`、`borderless`），搜索按钮放 `prefix-icon` / `suffix` 插槽
   - 联想、历史记录、自定义展开内容 → `t-auto-complete`，面板用 panel 类插槽自绘，样式照「联想 / 历史面板」表
   - 批量搜索 → 多行输入（`t-textarea` 或 `t-input` 多行），聚焦时高度 120px；标签形态用 `t-tag-input`
2. 搜索按钮是**独立可点区域**，不要做成纯装饰 icon；它有自己的 hover / disabled 态和 `2px` 圆角底色；容器 hover 时它跟着出现 hover 底色（无边框变体除外）
3. 一键清空图标的 `right` 随搜索按钮位置变（prefix `7px` / suffix `35px`），有内容就显示（含正在输入），不只限 `fill=true`
4. focus 且未输入时只留光标、不显示 placeholder；TDesign `t-input` 默认 focus 仍显示 placeholder，需在 focus 时把 placeholder 设为透明
5. focus ring 用 `box-shadow`（不占布局）而不是加粗边框，否则 32px 高度会被撑开
6. 面板宽度用 `left: -1px; right: -1px` 对齐输入框外沿，不要写死 240px
7. 字号 / 行高照抄，字体不声明（`font-family: inherit`）
8. `disabled` 时容器、文字、搜索按钮 icon 三者同时置灰

## 不可随意修改的部分

- 单行高度 `32px`、批量搜索聚焦高度 `120px`
- 不对称内边距：按钮侧 `4px`、文字侧 `8px`
- hover 用 `brand-color-hover` 边框、focus 用 `brand-color` 边框 + `2px` focus ring
- 无边框变体在 hover / focus 时会出现边框
- 面板 `top: 39px`、内边距 `6px`、圆角 `radius-medium`、阴影 `Light/Shadow/2`
- 搜索按钮 `24px` 高、`2px` 圆角、hover 底色 `bg-color-secondarycontainer`
- 一键清空 `right: 7px`（prefix）/ `35px`（suffix），多行时对齐第一行

## 设计稿不一致（照原样记录，不在 Figma 里改，实现时按下方口径统一）

1. **focus ring 色不统一**：有边框 focus 用 token `brand-color-focus`（`#d0dcfd`），无边框 focus 写死 `#d9e1ff`。实现统一用 token。
2. **focus ring 缺失**：部分 focus 变体（如 `78092:236213`、`78092:236201` clearable + focus）没有画 ring，而 `78092:236165`、`78092:236225` 有。实现统一：所有 focus 态都加 ring。
3. **圆角写死 3px**：`borderless / normal`（`78092:236159`）与 popup 变体的内层 `searchInput`（`78712:238845`）用 `3px`，其余用 `radius-default 4px`。实现统一用 `radius-default`。
4. **popup 变体外层多一层边框**：`78092:236169`、`78746:238180` 的最外层 wrapper 带了 `1px component-border`（多行的 `78746:238204` 则是 `brand-color`），外层还挂了一个 spread 为 0 的空 focus 阴影；内层 `searchInput` 已有 focus 边框和 ring。实现时外层只作定位容器，不画边框、不加阴影。
5. **变体属性与图层不一致**：`fill=true` 且 `prefix=false, suffix=false` 的变体（如 `78092:236209`、`78092:236213`）左侧仍然渲染了搜索按钮。实现按「至少有一个搜索按钮，位置由 prefix / suffix 决定」处理。
6. **变体名错别字**：状态值是 `focus 聚集`（应为「聚焦」）、清空是 `clearable清空空`（多一个「空」字且缺空格）。保持 Figma 原样，不改名。
7. **禁用 + 已输入的变体挂在 focus 上**：`已输入 & disabled` 这一行（`78092:236175` / `236177` / `236205` / `236207` / `236238`）变体名是 `state=focus 聚集, disabled=true`，但画面是禁用态（无 focus 边框、无 ring）。实现时 disabled 优先，禁用态不响应 hover / focus。
8. **禁用 + 已输入 + prefix 的内边距反了**：`78092:236175`（按钮在左）用了 `8px 左 / 4px 右`，与其它 prefix 变体的 `4px 左 / 8px 右` 相反。实现统一按「按钮侧 4px、文字侧 8px」。
9. **示例页实例带旧 TDesign 色值**：`可自定义展开内容`（`78842:237009`）与 `带历史记录 · 正在输入`（`78842:237062`）两个实例的边框 / 高亮写死 `#0052d9`、ring `#d9e1ff`、文字 `black`、底色 `white`，是 TDesign 原版色值，没有换成 China Token。以组件集变体为准：边框 `brand-color`、ring `brand-color-focus`、高亮 `brand-color`、文字 `text-color-primary`。
10. **历史记录面板两个组标题都叫「历史记录」**：`78092:236142` 里第二组（`84030:174650`）的标题文字与第一组相同，像是复制后没改。实现时组标题由数据给，不写死文案。
