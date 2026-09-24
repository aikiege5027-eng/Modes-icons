# Table 表格（Web）

## 概述

**Figma 来源**：文件 `b5cc1y3jzLmOQkpa8vz5AX`（China Design system for web），页面 node-id `46868:353120`（`Table 表格 ✅`）

| 组件集 | node-id | 说明 |
|---|---|---|
| `Table 表格(row行模式)` | `46879:371097` | 整表按「行」拼装，变体维度是边框 / 斑马纹 / 展开 / 列数 / 行数 |
| `Table 表格(column 列模式)` | `46879:370298` | 整表按「列」拼装，变体维度是尺寸 / 边框 / 行选中 |
| `Table表格示例`（设计示例页） | `48484:516346` | 24 个业务场景示例，含筛选、加载、多级表头、拖拽等 |

> 同一个表格给了行模式与列模式两套组件集。列模式用于需要整列控制的场景（列固定、列拖拽、多级表头、列宽调整）；行模式用于按行控制的场景（斑马纹、展开行、行选中）。落地代码只有一套 `t-table`，两套组件集只是设计侧的拼装方式差异，**不要在代码里区分**。

### 子组件（item 级）

表头单元格：

| 子组件 | 无右分隔线 | 带右分隔线 |
|---|---|---|
| `item/header/cell/*` | `46879:362679` | `46879:364110` |
| `item/header/select cell/*` | `46879:362581` | `46879:363976` |

内容单元格：

| 子组件 | 无右分隔线 | 带右分隔线 |
|---|---|---|
| `item/content/cell/*` | `46879:365604` | `46879:366037` |
| `item/content/select cell/*` | `46879:362612` | `46879:364019` |

行 / 列 / 列头容器：

| 子组件 | normal | border |
|---|---|---|
| `item/content/row header/*/{4,6,8}` | `46879:370668` / `370691` / `370722` | `46879:370575` / `370598` / `370629` |
| `item/content/row/*/no/{4,6,8}` | `46879:370991` / `370929` / `370957` | `46879:370761` / `370783` / `370811` |
| `item/content/row/*/zebra/{4,6,8}` | `46879:371075` / `371013` / `371041` | `46879:370907` / `370845` / `370873` |
| `item/content/column/*/{s,m,l}` | `46879:369022` / `368421` / `369623` | `46879:367672` / `366470` / `367071` |
| `item/content/column header/*/{s,m,l}` | `46879:368347` / `368273` / `368310` | `46879:370224` / `368384` / `370261` |

操作图标与状态：

| 子组件 | node-id | 变体 |
|---|---|---|
| `item/header/operationIcon/sorter` | `46879:362542` | `asc 升序` × `des 降序` |
| `item/header/operationIcon/expandIcon` | `46879:362558` | `state 展开态` × `hover 悬浮` |
| `item/header/operationIcon/filter` | `46879:362576` | `hover 悬浮` |
| `item/content/state` | `46879:365596` | normal / error / warn / default |

**适用场景**：展示同类结构下的多种数据，支持搜索、筛选、排序。一般包括表头、数据行、表尾三部分。

**TDesign 对应**：`t-table`（含 `t-base-table` / `t-primary-table` / `t-enhanced-table`）。

## 变体矩阵

### 整表

| 维度 | Figma 变体名 | 取值 | 出现在 |
|---|---|---|---|
| 尺寸 | `size 尺寸` | `small 小尺寸`(36) / `medium 中尺寸`(46) / `large 大尺寸`(54) | 列模式 |
| 边框 | `border 边框` | true / false | 两者 |
| 斑马纹 | `zebra 斑马线` | true / false | 行模式 |
| 展开 | `expand 下拉` | true / false | 行模式 |
| 列数 | `columns 列数` | 4 / 6 / 8 | 行模式 |
| 行数 | `row 行数` | 6 / 8 / 10 / 20 | 行模式 |
| 行选中 | `row-select 选中行` | true / false | 列模式 |
| 选中方式 | `↳checkProps 选中选项` | `checkbox 多选` / `radio 单选` / n/a | 列模式 |

### 单元格

| 维度 | Figma 变体名 | 取值 |
|---|---|---|
| 尺寸 | `size 尺寸` | small / medium / large |
| 对齐 | `align 排列方式` | `left 左` / `center 中` / `right 右` |
| 内容类型 | `text 文字` / `operations 操作` / `button 按钮` / `state 状态` / `tag 标签` | 互斥的内容形态，可与 text 组合 |
| 前置图标 | `icon 图标`（content/normal）/ `prefixIcon 前置图标`（content/border、header） | true / false |
| 斑马纹 | `zebra 斑马纹` | true / false |
| 固定表头 | `fixedrow 固定表头` | true / false（仅表头单元格） |
| 筛选 | `filter 筛选` | true / false（仅表头单元格） |
| 排序 | `sortIcon 排序` | true / false（仅表头单元格） |
| 列固定 | `fix 固定` + `↳direction 方向` | false / true × left / right（仅 column 容器） |

> 同一个「前置图标」概念在 `item/content/cell/normal` 里叫 `icon 图标`，在 `item/content/cell/border` 与所有表头单元格里叫 `prefixIcon 前置图标`。**这是设计稿内部的命名不一致**，代码里统一用一个 prop（建议 `prefixIcon`），不要跟着分叉。

## Token 映射

| Figma 变量 | 项目 CSS variable | 色值 |
|---|---|---|
| `Color/grey/bg-color-container` | `--bg-color-container` | `#ffffff` |
| `Color/grey/bg-color-secondarycontainer` | `--bg-color-secondarycontainer` | `#f5f7fa` |
| `Color/grey/component-stroke` | `--component-stroke` | `#dfe1e8` |
| `text/text-color-primary` | `--text-color-primary` | `#141414` |
| `text/text-color-placeholder` | `--text-color-placeholder` | `#8f9195` |
| `Color/error/error-color` | `--error-color` | `#f51414` |
| `Color/warning/warning-color` | `--warning-color` | `#f98600` |
| `dimension/success/success-color` | `--success-color` | `#1ed273` |

> 成功色在 Figma 里的路径是 `dimension/success/success-color` —— 一个颜色变量被放进了 `dimension` 分组，与 error / warning 的 `Color/*` 路径不一致。**这是 Figma 侧的分组错误**，代码里正常映射到 `--success-color` 即可；按 `design-system-vue.md` 的约定不改 Figma 变量名，但值得反馈给设计。

## 结构

```
Table
├── table（表格主体）
│   ├── row header（表头行）
│   │   ├── select cell（可选：全选 checkbox）
│   │   └── header cell × N
│   └── row × N（数据行）
│       ├── select cell（可选：行 checkbox / radio）
│       ├── cell × N
│       └── expand panel（可选：展开行内容）
├── loading（可选：加载条 + 文案）
├── 筛选条（可选：命中结果说明 + 清空筛选）
└── Pagination 分页（独立组件，高 64px）

header cell
└── cell-inner
    ├── prefixIcon（可选，16px）
    ├── content（label 文字，flex-1，单行省略）
    ├── sorter（可选，16px）
    └── filter（可选，16px）

content cell
└── cell-inner
    └── 以下之一：text / operations(Link×N) / button / state / tag，可与 text 组合
```

## 容器规范

| 项目 | 值 |
|---|---|
| 表格背景 | `bg-color-container` `#ffffff` |
| 单元格分隔线 | 每个单元格自带 `border-bottom: 1px solid component-stroke`；`border` 变体额外带 `border-right: 1px solid component-stroke` |
| 设计稿基准宽度 | 整表 `1200px`；item 组件默认列宽 `240px`，示例页多为 `300px` |
| 分页 | 独立 `Pagination 分页` 组件，高 `64px`，紧随表格下方 |

> 表格没有自己的外框：`border` 变体的边框效果完全由每个单元格的 bottom / right 分隔线拼出来。因此**不要**给 `<table>` 或容器加 border，否则最外圈会出现双线。

## 表头单元格规范（item/header/cell）

| 属性 | small | medium | large |
|---|---|---|---|
| 高度 | `36px` | `46px` | `54px` |
| padding | `8px` 四边 | `12px` 上下 / `16px` 左右 | `16px` 上下 / `24px` 左右 |
| 字号 / 行高 | `12px / 20px`（Foot 12/Regular） | `14px / 22px`（Body 14/Regular） | `14px / 22px` |
| 字重 | `400` | `400` | `400` |
| 文字颜色 | `text-color-placeholder` `#8f9195` | 同 | 同 |
| 图标尺寸（prefixIcon / sorter / filter） | `16px` | `16px` | `16px` |
| 文字溢出 | `flex: 1`，单行 `text-overflow: ellipsis` | 同 | 同 |

高度反推：small `8+20+8=36`、medium `12+22+12=46`、large `16+22+16=54`，与 Figma 标注一致。

**表头背景**

| fixedrow 固定表头 | 背景 | Token |
|---|---|---|
| false | `#ffffff` | `bg-color-container` |
| true | `#f5f7fa` | `bg-color-secondarycontainer` |

> 表头文字用的是 **placeholder 灰**（`#8f9195`）而不是主文字色或次要文字色，且**字重是 400 不加粗**。这与多数表格「表头加粗」的习惯相反，是本设计系统的明确选择，不要自行改成 600 或 `text-color-secondary`。

## 内容单元格规范（item/content/cell）

| 属性 | small | medium | large |
|---|---|---|---|
| 高度 | `36px` | `46px` | `54px` |
| padding（normal 变体） | `8px` 四边 | `12px` 上下 / 左 `16px` 右 `24px` | `16px` 上下 / `24px` 左右 |
| padding（border 变体） | `8px` 四边 | `12px` 上下 / `16px` 左右 | `16px` 上下 / `24px` 左右 |
| 字号 / 行高 | `12px / 20px` | `14px / 22px` | `14px / 22px` |
| 字重 | `400` | `400` | `400` |
| 文字颜色 | `text-color-primary` `#141414` | 同 | 同 |
| 前置图标尺寸 | `16px` | `16px` | `16px` |
| 文字溢出 | `flex: 1`，单行 `text-overflow: ellipsis` | 同 | 同 |

> **medium 尺寸下 normal 与 border 变体的右内边距不同**：normal 是左 16 右 24（不对称），border 是左右各 16。合理解释是 normal 变体没有右分隔线，多留 8px 补足视觉间距。small 与 large 两个变体的内边距一致，只有 medium 有这个差异。**实现时按变体分别取值，不要统一成一个数。**

**内容单元格背景**

| zebra 斑马纹 | 背景 | Token |
|---|---|---|
| false | `#ffffff` | `bg-color-container` |
| true | `#f5f7fa` | `bg-color-secondarycontainer` |

> 斑马纹用的是 `bg-color-secondarycontainer`，**不是** `bg-color-component`（`#f2f4f7`）。两者色值相近但 Token 不同，按 Token 名实现。固定表头的背景与斑马纹同为 `bg-color-secondarycontainer`。

## 选择列规范（select cell）

| size | 尺寸 |
|---|---|
| small | `36 × 36px` |
| medium | `46 × 46px` |
| large | `54 × 54px` |

- 选择列是正方形，边长等于行高
- `check 多选=true` → checkbox；`radio 单选=true` → radio；`blank 空白=true` → 占位空格（用于表头不需要全选、或展开列占位）
- 内容单元格的选择列额外有 `expandIcon 展开=true` 变体，用展开箭头替代勾选控件
- 与表头单元格一样有 `fixedrow 固定表头` 变体，背景规则同上

## 状态单元格规范（item/content/state）

结构：`6px` 圆点 + `4px` gap + 文字（`14px / 22px`，字重 400）

| state | 示例文案 | 文字 / 圆点颜色 | Token |
|---|---|---|---|
| `normal 默认` | 健康 | `#1ed273` | `success-color` |
| `error 错误` | 异常 | `#f51414` | `error-color` |
| `warn 警告` | 警告 | `#f98600` | `warning-color` |
| `default 失效` | 失效 | `#8f9195` | `text-color-placeholder` |

> 圆点在 Figma 里是 `Ellipse` 矢量，实现时用 CSS 圆点即可（`width/height: 6px; border-radius: var(--radius-circle)`），颜色与文字同色，不必单独取 SVG。**不要用 `50%` 画圆**。

## 行规范

| 项目 | 值（medium） |
|---|---|
| 普通行高 | `46px`（= 单元格高度） |
| 展开行（`expandProps=false`） | `46px` |
| 展开行（`expandProps=true`） | `136px`（行 46 + 展开内容区 90） |
| 表头行 | `46px` |

行模式组件集提供 4 / 6 / 8 列与 6 / 8 / 10 / 20 行的组合，仅用于设计稿排版，代码中列数行数由数据决定。

## Icon 清单

| 用途 | icon | 尺寸 | Figma 子组件 |
|---|---|---|---|
| 排序（未排序 / 升序 / 降序） | 上下箭头组合 | 16px | `item/header/operationIcon/sorter` `46879:362542` |
| 筛选 | `filter` | 16px | `item/header/operationIcon/filter` `46879:362576` |
| 展开 / 收起 | `chevron-right` / `chevron-down` | 16px | `item/header/operationIcon/expandIcon` `46879:362558` |
| 单元格前置图标 | 业务自定（slot / prop 传入） | 16px | — |

- 排序与筛选图标都有 `hover 悬浮` 变体；展开图标有 `state 展开态` × `hover 悬浮` 两维
- 实现时用 `get_design_context` 从 Icon 库（文件 `vuD3onrb6PS5UtMrGdgbrA`，Icon 页 `192:1494`）读取真实 SVG path 内联，`fill="currentColor"`
- 操作列（`operations 操作`）用的是 `Link 链接` 组件而不是图标按钮；`button 按钮` 变体用 `Button 按钮` 组件

## 实现要点

1. 用 `t-table` 承载，props 对应关系：
   - `size`：`small` / `medium` / `large`
   - `bordered`：对应 `border 边框`
   - `stripe`：对应 `zebra 斑马线`
   - `expandedRow` / `expandOnRowClick`：对应 `expand 下拉`
   - `selectedRowKeys` + 列 `type: 'multiple' | 'single'`：对应 `row-select` + `checkProps`
   - `fixedRows` / `headerAffixedTop`：对应 `fixedrow 固定表头`
   - 列 `fixed: 'left' | 'right'`：对应 `fix 固定` + `direction 方向`
   - `sorter` / `filter`：对应表头的 `sortIcon` / `filter`
2. 分隔线只画在单元格上（bottom + border 变体的 right），容器不加边框
3. 表头文字是 placeholder 灰 + 400 字重，与内容文字（primary + 400）区分靠颜色而非字重
4. 固定表头与斑马纹共用 `bg-color-secondarycontainer`；两者同时出现时表头仍是该色，不叠深
5. 单元格文字统一 `flex: 1` + 单行省略；多行截断是示例页里的独立场景（`数据显示-多行截断`，配 Tooltip），不是单元格默认行为
6. 字号随尺寸变：small 用 `12/20`，medium 与 large 都用 `14/22` —— **large 只增内边距不增字号**
7. 溢出内容配 `Tooltip 文字提示` 组件（示例页 `64316:218848` / `64318:218890`）

## 不可随意修改的部分

- 三档行高 `36 / 46 / 54px` 与对应内边距（来自 Figma 精确标注；注意不是 32/40/48 这类 8 的倍数）
- 表头文字色 `text-color-placeholder` 与字重 `400`
- 内容文字色 `text-color-primary`
- 斑马纹与固定表头的 `bg-color-secondarycontainer`（不要换成 `bg-color-component`）
- 分隔线一律 `1px` `component-stroke`，且只由单元格绘制
- medium 尺寸下 normal 变体内容单元格的不对称内边距（左 16 右 24）
- 状态圆点 `6px` + gap `4px` 与四档状态色的 Token 归属
