---
name: web-components
description: KONE China Web 端组件规范库（基于 TDesign Vue Next + China Design Token）。收录 Tabs 选项卡等 Web 端组件的 Figma 来源、尺寸/状态/Token 规范与实现要点。当需要实现、修改或核对 Web 端（桌面端）组件，或用户提到 Tabs 选项卡、web-components、Web 端组件规范时使用；移动端组件不适用。
---

# KONE China Web 端组件规范库

本 skill 收录**仅适用于 Web（桌面端）**的组件规范。每个组件一份 reference 文档，记录 Figma 来源、精确视觉规范、状态矩阵、TDesign 映射和实现要点。

## 适用范围

- 目标框架：Vue 3 + **TDesign Vue Next**
- Token：KONE China Design Token（语义化层），色值一律用 CSS variable
- 移动端（TDesign Mobile Vue）组件不在此 skill 内
- 与 `design-system-vue.md`（Token 与全局规范）、`custom-components.md`（TDesign 之外从零自建的组件）并行；本 skill 侧重「Web 端组件按 Figma 规范落地」

## 组件清单

| 组件 | 说明 | 规范文档 |
|---|---|---|
| Tabs 选项卡 | 默认主题 / 卡片主题，top / left 两种位置，medium / large 两种尺寸，支持图标、增减、滑动 | `references/tabs.md` |
| Button 按钮 | base / outline / dash / text / ghost 五类型 × default / primary / Secondary / danger 主题 × small / medium / large × 4 形状 | `references/button.md` |
| Search 搜索 | 带搜索按钮的输入框，含无边框、一键清空、批量搜索、联想 / 历史面板；附 item/searchBox、item/searchPopup 子组件 | `references/search.md` |
| Table 表格 | 行模式 / 列模式两套组件集，small / medium / large 三档行高（36/46/54），边框、斑马纹、展开行、行选中、固定表头、列固定、排序、筛选 | `references/table.md` |

<!-- 后续新增组件在此追加一行，并在 references/ 下新增同名文档 -->

## 通用约定（所有 Web 组件适用）

1. **优先用 TDesign 组件承载结构与交互**，只覆盖视觉。覆盖方式优先在全局 `style.css` 的 `:root` 覆盖 TDesign CSS 变量，避免逐个组件 `:deep() + !important`
2. **颜色全部用 China Token 的 CSS variable**，不写死十六进制（除设计稿明确指定的特殊配色，需在文档中标注）
3. **字号/行高照抄 Figma，字体不照抄**：Figma 文本样式标注为 `PingFang SC`，代码里不声明字体，统一 `font-family: inherit` 由 `body` 的系统字体栈继承
4. **Icon 从 Figma Design System 读取真实 SVG path 内联**，`fill="currentColor"`，靠 CSS `color` 控色；不用 `<img>` 引 Figma URL（7 天过期）
5. **圆角用 radius token**；胶囊/全圆用 `var(--radius-circle)`（`9999px`），不写 `50%`
6. **间距用基础尺寸单位**（2 的倍数，以 4 为主）；Figma 中出现的奇数内边距（如 `py: 5px` / `13px`）是为凑固定高度，照抄即可，但要在文档中说明它来自高度反推

## 如何新增组件

1. 把 Figma 组件链接发给 Kiro（右键 → Copy link 取 node-id）
2. Kiro 用 `get_design_context` 读取组件集与关键变体，提取尺寸、内边距、状态色、Token 名
3. 在 `references/` 下新增 `[组件名].md`，结构参照 `references/tabs.md`：
   - 概述（Figma 来源 / 适用场景 / TDesign 对应组件）
   - 变体矩阵
   - 容器规范 + 子项规范（分主题、分尺寸列表格）
   - 状态与配色表（含 Token 名与色值）
   - Icon 清单
   - 实现要点 / 不可随意修改的部分
4. 在本文件「组件清单」表格追加一行
5. 落地代码时组件文件放 `src/components/`，展示文档页布局遵循 `custom-components.md` 的展示页规范

## 记录规范文档时的要求

- 尺寸、内边距、色值必须来自 `get_design_context` 的真实读数，不靠截图目测或经验推断
- 同时记录 **Figma 变量名** 和 **项目 CSS variable 名**，两者不一致时用映射表连接，不改 Figma 变量名
- 设计稿内部存在不一致（例如同一状态在 medium 与 large 变体里取色不同）时，明确写出以哪个为准，并标注差异，不要静默取一个
