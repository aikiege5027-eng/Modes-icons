---
inclusion: always
---

# 公司设计系统规范（KONE China Design Token）— Vue 版

基于 TDesign Vue Next，使用 KONE China 自定义 Design Token。生成 Vue 代码时必须严格遵循以下规范。

> **与 React 版（design-system-react.md）双向同步维护。任一文件修改 Token、变量数量、命名例外、Light/Dark 值、映射关系或使用规范时，必须在同一次变更中更新另一文件。两者只有框架语法和组件库不同。**

---

## 核心开发原则（已验证）

### 1. 组件库：使用 TDesign，但替换为公司 Token

- 用 TDesign 组件负责结构和交互，**不要**用 TDesign 默认的颜色和样式
- 所有颜色、圆角、间距必须替换为本文件中定义的 China Token 值
- **覆盖 TDesign 样式的正确方式：优先在全局 `style.css` 的 `:root` 中覆盖 TDesign CSS 变量**（如 `--td-brand-color: #1450f5`），这是最稳定、最彻底的方式，所有组件自动生效，无需逐个覆盖
- **不推荐**在组件内用 `:deep()` + `!important` 逐个覆盖色值，TDesign 内部选择器优先级可能导致覆盖不稳定
- 按钮等组件优先使用 TDesign 官方 prop 实现效果（如胶囊按钮用 `shape="round"`，不要用 CSS 硬改圆角）
- 项目的 `src/style.css` 已在 `:root` 中完整覆盖了所有 TDesign CSS 变量为 KONE China Token，新建页面时直接使用即可，无需重复覆盖

### 2. 颜色：严格使用 China Token 语义化层

- 优先使用语义化 token（China Token 层），不直接使用 Primitives 原始色值
- Figma Token 名称保持原样，不因代码或 TDesign 命名而修改；通过等价映射连接 Figma、CSS 与 TDesign
- `text/*` 与 `Color/text/*` 按同一语义分类识别，匹配时忽略大小写，但不得在 Figma 中重命名或重复创建变量
- `Primitives` 与 `Primitives-Dark` 是有意设置的非镜像集合，不以补齐数量或名称为目的修改任一集合
- 常用对照：
  - 主色按钮背景：`#1450f5`（brand-color）
  - 主色 hover：`#4373f7`（brand-color-hover）
  - 主色 active：`#1444c8`（brand-color-active）
  - 禁用：`#a1b9fb`（brand-color-disabled）
  - 主要文字：`#141414`（text-color-primary）
  - 次要文字：`#676a72`（text-color-secondary）
  - 占位符：`#8f9195`（text-color-placeholder）
  - 禁用文字：`#abadb2`（text-color-disabled）
  - 页面背景：`#f5f7fa`（bg-color-page）
  - 卡片背景：`#ffffff`（bg-color-container）
  - 组件边框：`#c8cad0`（component-border）
  - 报错色：`#f51414`（error-color）
  - 成功色：`#1ed273`（success-color）
  - 警告色：`#f98600`（warning-color）

### 3. Icon：从 Figma Design System 读取真实 SVG

- **不要**使用 `<img>` 标签引用 Figma URL（URL 会在 7 天后过期）
- **不要**自己画 SVG path，必须从 Figma 读取真实 path
- 正确流程：
  1. 用 `get_design_context` 工具读取 Figma 中对应 icon 的节点
  2. 取出真实的 SVG path 数据
  3. 将 path **内联**到组件模板的 `<svg>` 标签中
  4. 使用 `fill="currentColor"` 或 `stroke="currentColor"`，通过 CSS `color` 控制颜色
  5. 通过 `width`/`height` 属性控制尺寸，`viewBox` 保持原始值
- Figma 文件 key：`vuD3onrb6PS5UtMrGdgbrA`
- Icon 页面 node-id：`192:1494`

### 4. 插画：从 Figma Illustration 页面读取

- 插画用于缺省页、空状态等场景
- 浅色模式用 `-light` 版本，深色模式用 `-Dark` 版本
- 获取方式同 icon，用 `get_design_context` 读取对应节点，内联 SVG 或下载为本地资源

### 5. TDesign slot 限制

- TDesign 的某些 slot（如 `t-input` 的 `#suffix-icon`）可能不渲染自定义内容
- 遇到此类问题时，改为自己用原生 HTML 实现该部分 UI，样式与 TDesign 保持一致
- 例：密码输入框的显示/隐藏图标，使用原生 `<input>` + 自定义 wrapper 实现

### 6. 字体

- 调用**系统字体**，不指定特定字体文件，不写 `PingFang SC` 作为第一优先级
- CSS 写法：`font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;`
- 组件内**不需要**单独声明 `font-family`，统一由 `body` 继承，使用 `font-family: inherit` 即可
- 只规定**字重**和**行高**，不规定具体字体：
  - 正文 Regular：`font-weight: 400`
  - 强调 / 按钮 / 标题 Semibold：`font-weight: 600`
- 字号与行高规范：

| 样式名 | 字号 | 字重 | 行高 |
|---|---|---|---|
| H3 28/Semibold | 28px | 600 | 36px |
| H6 18/Semibold | 18px | 600 | 26px |
| H7 16/Semibold | 16px | 600 | 24px |
| H7 16/Regular | 16px | 400 | 24px |
| Body 14/Semibold | 14px | 600 | 22px |
| Body 14/Regular | 14px | 400 | 22px |
| Foot 12/Regular | 12px | 400 | 20px |

---

## 组件库

### Web 端
- 使用 **TDesign Vue Next**（`tdesign-vue-next`）
- 优先使用 TDesign 现有组件，不要自己手写基础组件样式

### Mobile 端
- 使用 **TDesign Mobile Vue**（`tdesign-mobile-vue`）
- 优先使用 TDesign Mobile 现有组件，不要自己手写基础组件样式

### 通用
- 字体调用**系统字体**，不指定具体字体文件，组件内使用 `font-family: inherit`
- Token 层对 Web 和 Mobile 端通用，两端共享同一套设计语言

---

## Token 层级结构

```
Primitives/Mode 1（原始色板）
        ↓ 引用
China Token/Light（浅色模式语义化 token，开发直接使用这层）

Primitives-Dark/Mode 1（深色模式原始色板）
        ↓ 引用
China Token/Dark（深色模式语义化 token，开发直接使用这层）

Data visualization/Light|Dark|Brand Light|Brand Dark（图表配色，独立体系）
```

**开发规范：优先使用语义化 token（China Token 层），不要直接使用 Primitives 原始色值。**

### Theme / Design System 文档页

- `基础 → Theme / Design System` 用于说明 UI Token 体系，展示顺序为：Token 层级、China Token、Primitives、等价映射、使用规范
- China Token 是页面主要内容；Primitives 与 Primitives-Dark 只作为来源参考，不放在开发使用路径之前
- Primitives 与 Primitives-Dark 必须分栏或分区独立展示，并明确标注其为有意设置的非镜像集合；不得使用逐项差异或缺失提示暗示需要补齐
- China Token 色卡必须使用实际 CSS Variable 渲染，并显示当前 Light / Dark 主题下解析后的值
- Figma Token 名称保持原样；Web 与 TDesign 名称只在等价映射表中展示，不修改 Figma 变量

---

## Primitives 色板（来源层，不直接用于代码）

> 唯一事实来源：Figma `Design Token China` 文件的 `Primitives` collection（95 个 COLOR variables，Mode 1）。以下清单必须保持完整，不得只摘录组件当前使用的色阶。

### color.brand_1st

| 别名 | 引用 / 色值 |
|---|---|
| color.brand_1st.KONE_blue | {color.blue.500} · `#1450f5` |
| color.brand_1st.white | {color.grey.0} · `#ffffff` |
| color.brand_1st.black | {color.grey.800} · `#141414` |

### color.brand_2nd

| 别名 | 色值 |
|---|---|
| color.brand_2nd.sand | `#f3eee6` |
| color.brand_2nd.yellow | `#ffe141` |
| color.brand_2nd.light_blue | `#d2f5ff` |
| color.brand_2nd.pink | `#ffcdd7` |
| color.brand_2nd.green | `#aae1c8` |

### color.blue

| 别名 | 色值 |
|---|---|
| color.blue.10 | `#f8faff` |
| color.blue.50 | `#f3f6fe` |
| color.blue.70 | `#e7edfe` |
| color.blue.100 | `#d0dcfd` |
| color.blue.200 | `#a1b9fb` |
| color.blue.300 | `#7296f9` |
| color.blue.400 | `#4373f7` |
| color.blue.500 | `#1450f5` |
| color.blue.600 | `#1444c8` |
| color.blue.700 | `#14389b` |
| color.blue.800 | `#142c6e` |
| color.blue.900 | `#142041` |

### color.grey

| 别名 | 色值 |
|---|---|
| color.grey.0 | `#ffffff` |
| color.grey.50 | `#fafbfc` |
| color.grey.100 | `#f5f7fa` |
| color.grey.200 | `#f2f4f7` |
| color.grey.250 | `#eaecf1` |
| color.grey.300 | `#dfe1e8` |
| color.grey.350 | `#d5d7de` |
| color.grey.400 | `#c8cad0` |
| color.grey.450 | `#abadb2` |
| color.grey.500 | `#8f9195` |
| color.grey.600 | `#676a72` |
| color.grey.700 | `#43464f` |
| color.grey.725 | `#333740` |
| color.grey.750 | `#262a33` |
| color.grey.775 | `#1d1f26` |
| color.grey.800 | `#141414` |
| color.grey.900 | `#000000` |

### color.green

| 别名 | 色值 |
|---|---|
| color.green.50 | `#dbfbea` |
| color.green.100 | `#b2f5d2` |
| color.green.200 | `#8ceeba` |
| color.green.300 | `#66e6a2` |
| color.green.400 | `#4bdb8f` |
| color.green.500 | `#1ed273` |
| color.green.600 | `#16b662` |
| color.green.700 | `#0f9950` |
| color.green.800 | `#097b3f` |
| color.green.900 | `#055b2e` |

### color.orange

| 别名 | 色值 |
|---|---|
| color.orange.50 | `#fff1db` |
| color.orange.100 | `#ffe1b3` |
| color.orange.200 | `#ffd18d` |
| color.orange.300 | `#ffc168` |
| color.orange.400 | `#ffb145` |
| color.orange.500 | `#ffa023` |
| color.orange.550 | `#f98600`（China 专用） |
| color.orange.600 | `#d97019` |
| color.orange.700 | `#b34711` |
| color.orange.800 | `#8c250a` |
| color.orange.900 | `#660c05` |

### color.red-UI

| 别名 | 色值 |
|---|---|
| color.red-UI.50 | `#fef3f3` |
| color.red-UI.100 | `#fdd0d0` |
| color.red-UI.200 | `#fba1a1` |
| color.red-UI.300 | `#f97272` |
| color.red-UI.400 | `#f74343` |
| color.red-UI.500 | `#f51414` |
| color.red-UI.600 | `#c41010` |
| color.red-UI.700 | `#930c0c` |
| color.red-UI.800 | `#620808` |

### color.red-brand

| 别名 | 色值 |
|---|---|
| color.red-brand.50 | `#ffe5dc` |
| color.red-brand.100 | `#ffc9b5` |
| color.red-brand.200 | `#ffae8f` |
| color.red-brand.300 | `#ff936b` |
| color.red-brand.400 | `#ff7949` |
| color.red-brand.500 | `#ff5f28` |
| color.red-brand.600 | `#d9371d` |
| color.red-brand.700 | `#b31515` |
| color.red-brand.800 | `#8c0d1d` |
| color.red-brand.900 | `#660721` |

### color.purple

| 别名 | 色值 |
|---|---|
| color.purple.50 | `#e3e3ff` |
| color.purple.100 | `#c5c4ff` |
| color.purple.200 | `#a7a6ff` |
| color.purple.300 | `#8b8aff` |
| color.purple.400 | `#706eff` |
| color.purple.500 | `#5654fc` |
| color.purple.600 | `#4947e2` |
| color.purple.700 | `#3c3bc6` |
| color.purple.800 | `#312fa9` |
| color.purple.900 | `#26258c` |

### color.yellow

| 别名 | 色值 |
|---|---|
| color.yellow.100 | `#fef0cc` |
| color.yellow.200 | `#fde199` |
| color.yellow.300 | `#fdd366` |
| color.yellow.400 | `#fcc433` |
| color.yellow.500 | `#fbb500` |
| color.yellow.600 | `#c99100` |
| color.yellow.700 | `#976d00` |
| color.yellow.800 | `#644800` |

---

## Primitives-Dark 色板（深色模式来源层，不直接用于代码）

> 唯一事实来源：Figma `Design Token China` 文件的 `Primitives-Dark` collection（87 个 COLOR variables，Mode 1）。China Token/Dark 引用此色板。它与 Primitives 是有意设置的非镜像集合；`brand_1st` / `brand_2nd` 仅存在于 Primitives，不得复制到此集合。

### color.blue（深色模式）

| 别名 | 色值 |
|---|---|
| color.blue.10 | `#f8fbff` |
| color.blue.50 | `#f0f8ff` |
| color.blue.70 | `#e7f3ff` |
| color.blue.100 | `#cee6ff` |
| color.blue.200 | `#9dceff` |
| color.blue.300 | `#6cb5ff` |
| color.blue.400 | `#3b9dff` |
| color.blue.500 | `#0a84ff` |
| color.blue.600 | `#086acc` |
| color.blue.700 | `#064f99` |
| color.blue.800 | `#043566` |
| color.blue.900 | `#021a33` |

### color.grey（深色模式）

> 与浅色模式的 grey 色板相同，灰色系不区分深浅模式。

| 别名 | 色值 |
|---|---|
| color.grey.0 | `#ffffff` |
| color.grey.50 | `#fafbfc` |
| color.grey.100 | `#f5f7fa` |
| color.grey.200 | `#f2f4f7` |
| color.grey.250 | `#eaecf1` |
| color.grey.300 | `#dfe1e8` |
| color.grey.350 | `#d5d7de` |
| color.grey.400 | `#c8cad0` |
| color.grey.450 | `#abadb2` |
| color.grey.500 | `#8f9195` |
| color.grey.600 | `#676a72` |
| color.grey.700 | `#43464f` |
| color.grey.725 | `#333740` |
| color.grey.750 | `#262a33` |
| color.grey.775 | `#1d1f26` |
| color.grey.800 | `#141414` |
| color.grey.900 | `#000000` |

### color.red-UI（深色模式）

| 别名 | 色值 |
|---|---|
| color.red-UI.50 | `#ffeceb` |
| color.red-UI.100 | `#ffdad8` |
| color.red-UI.200 | `#ffb5b0` |
| color.red-UI.300 | `#ff8f89` |
| color.red-UI.400 | `#ff6a61` |
| color.red-UI.500 | `#ff453a` |
| color.red-UI.600 | `#cc372e` |
| color.red-UI.700 | `#992923` |
| color.red-UI.800 | `#66231f` |
| color.red-UI.900 | `#330e0b` |

### color.red-brand（深色模式）

| 别名 | 色值 |
|---|---|
| color.red-brand.50 | `#ffe5dc` |
| color.red-brand.100 | `#ffc9b5` |
| color.red-brand.200 | `#ffae8f` |
| color.red-brand.300 | `#ff936b` |
| color.red-brand.400 | `#ff7949` |
| color.red-brand.500 | `#ff5f28` |
| color.red-brand.600 | `#d9371d` |
| color.red-brand.700 | `#b31515` |
| color.red-brand.800 | `#8c0d1d` |
| color.red-brand.900 | `#660721` |

### color.orange（深色模式）

| 别名 | 色值 |
|---|---|
| color.orange.50 | `#fff5e7` |
| color.orange.100 | `#ffecce` |
| color.orange.200 | `#ffd99d` |
| color.orange.300 | `#ffc56c` |
| color.orange.400 | `#ffb23b` |
| color.orange.500 | `#ff9f0a` |
| color.orange.600 | `#cc7f08` |
| color.orange.700 | `#995f06` |
| color.orange.800 | `#664004` |
| color.orange.900 | `#332002` |

### color.green（深色模式）

> 50–700 与 Primitives 相同；800、900 使用 Primitives-Dark 专属值。

| 别名 | 色值 |
|---|---|
| color.green.50 | `#dbfbea` |
| color.green.100 | `#b2f5d2` |
| color.green.200 | `#8ceeba` |
| color.green.300 | `#66e6a2` |
| color.green.400 | `#4bdb8f` |
| color.green.500 | `#1ed273` |
| color.green.600 | `#16b662` |
| color.green.700 | `#0f9950` |
| color.green.800 | `#14663b` |
| color.green.900 | `#03331a` |

### color.purple（深色模式）

| 别名 | 色值 |
|---|---|
| color.purple.50 | `#f0f0ff` |
| color.purple.100 | `#e2e1ff` |
| color.purple.200 | `#c5c4ff` |
| color.purple.300 | `#a7a6ff` |
| color.purple.400 | `#8a89ff` |
| color.purple.500 | `#6d6bff` |
| color.purple.600 | `#5756cc` |
| color.purple.700 | `#414099` |
| color.purple.800 | `#2c2b66` |
| color.purple.900 | `#161533` |

### color.yellow（深色模式）

| 别名 | 色值 |
|---|---|
| color.yellow.100 | `#fff5db` |
| color.yellow.200 | `#ffebb8` |
| color.yellow.300 | `#ffe194` |
| color.yellow.400 | `#ffd770` |
| color.yellow.500 | `#ffcd4d` |
| color.yellow.600 | `#cca43d` |
| color.yellow.700 | `#997b2e` |
| color.yellow.800 | `#66521f` |

---

## 语义化 Token — China Token/Light（浅色模式，默认）

### 品牌色

| Token | Primitives 引用 | 色值 |
|---|---|---|
| brand-color（主色） | {color.blue.500} | `#1450f5` |
| brand-color-hover | {color.blue.400} | `#4373f7` |
| brand-color-active | {color.blue.600} | `#1444c8` |
| brand-color-disabled | {color.blue.200} | `#a1b9fb` |
| brand-color-light（浅背景） | {color.blue.50} | `#f3f6fe` |
| brand-color-focus | {color.blue.100} | `#d0dcfd` |
| brand-color-light-hover | {color.blue.100} | `#d0dcfd` |
| brand-color-light-active | {color.blue.200} | `#a1b9fb` |
| brand-color-light-disabled | {color.blue.50} | `#f3f6fe` |

### 状态色

| 状态 | Token | Primitives 引用 | 色值 |
|---|---|---|---|
| 成功 | success-color | {color.green.500} | `#1ed273` |
| 成功 hover | success-color-hover | {color.green.400} | `#4bdb8f` |
| 成功 active | success-color-active | {color.green.600} | `#16b662` |
| 成功禁用 | success-color-disabled | {color.green.200} | `#8ceeba` |
| 成功浅背景 | success-color-light | {color.green.50} | `#dbfbea` |
| 成功 focus | success-color-focus | {color.green.100} | `#b2f5d2` |
| 警告 | warning-color | {color.orange.550} | `#f98600` |
| 警告 hover | warning-color-hover | {color.orange.400} | `#ffb145` |
| 警告 active | warning-color-active | {color.orange.600} | `#d97019` |
| 警告禁用 | warning-color-disabled | {color.orange.200} | `#ffd18d` |
| 警告浅背景 | warning-color-light | {color.orange.50} | `#fff1db` |
| 警告 focus | warning-color-focus | {color.orange.100} | `#ffe1b3` |
| 错误 | error-color | {color.red-UI.500} | `#f51414` |
| 错误 hover | error-color-hover | {color.red-UI.400} | `#f74343` |
| 错误 active | error-color-active | {color.red-UI.600} | `#c41010` |
| 错误禁用 | error-color-disabled | {color.red-UI.200} | `#fba1a1` |
| 错误浅背景 | error-color-light | {color.red-UI.50} | `#fef3f3` |
| 错误 focus | error-color-focus | {color.red-UI.100} | `#fdd0d0` |

### 文字色

| Token | Primitives 引用 | 色值 |
|---|---|---|
| text-color-primary（主要文字） | {color.grey.800} | `#141414` |
| text-color-secondary（次要文字） | {color.grey.600} | `#676a72` |
| text-color-placeholder（占位符） | {color.grey.500} | `#8f9195` |
| text-color-disabled（禁用） | {color.grey.450} | `#abadb2` |
| text-color-white（白色） | {color.grey.0} | `#ffffff` |
| text-color-brand（品牌色文字） | {color.blue.500} | `#1450f5` |
| text-color-link（链接） | {color.blue.500} | `#1450f5` |

### 背景色

| Token | Primitives 引用 | 色值 |
|---|---|---|
| bg-color-container（卡片/容器） | {color.grey.0} | `#ffffff` |
| bg-color-container-hover | {color.grey.100} | `#f5f7fa` |
| bg-color-container-active | {color.grey.300} | `#dfe1e8` |
| bg-color-page（页面背景） | {color.grey.100} | `#f5f7fa` |
| bg-color-secondarycontainer | {color.grey.100} | `#f5f7fa` |
| bg-color-secondarycontainer-hover | {color.grey.300} | `#dfe1e8` |
| bg-color-secondarycontainer-active | {color.grey.400} | `#c8cad0` |
| bg-color-component | {color.grey.200} | `#f2f4f7` |
| bg-color-component-hover | {color.grey.300} | `#dfe1e8` |
| bg-color-component-active | {color.grey.500} | `#8f9195` |
| bg-color-component-disabled | {color.grey.200} | `#f2f4f7` |

### 边框

| Token | Primitives 引用 | 色值 |
|---|---|---|
| component-border（组件边框） | {color.grey.400} | `#c8cad0` |
| component-stroke（描边，较浅） | {color.grey.300} | `#dfe1e8` |

### 圆角
| Token | 值 | 用途 |
|---|---|---|
| radius-small | `2px` | 极小（标签等） |
| radius-default | `4px` | 默认（输入框、按钮） |
| radius-medium | `6px` | 中等 |
| radius-large | `8px` | 大（卡片） |
| radius-extralarge | `12px` | 特大 |
| radius-circle | 设计语义 `50%`；Web `var(--radius-circle)` = `9999px` | 全圆；Figma 暂以 `128px` 表达。CSS 不得直接使用 `50%`，矩形元素会变成椭圆 |

### 组件尺寸
| Token | 值(px) | 对应 size |
|---|---|---|
| comp-size-xxxs | 16 | xxxs |
| comp-size-xxs | 20 | xxs |
| comp-size-xs | 24 | xs |
| comp-size-s | 28 | s |
| comp-size-m | 32 | m（默认） |
| comp-size-l | 36 | l |
| comp-size-xl | 40 | xl |
| comp-size-xxl | 48 | xxl |
| comp-size-xxxl | 56 | xxxl |
| comp-size-xxxxl | 64 | xxxxl |
| comp-size-xxxxxl | 72 | xxxxxl |

### 基础尺寸单位（间距/内外边距）
`2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 36 / 40 / 48 / 56 / 64 / 72`（单位 px）

---

## 语义化 Token — China Token/Dark（深色模式）

深色模式与浅色模式的主要差异：

| Token | Primitives 引用（深色） | 深色色值 | 浅色色值（对比） |
|---|---|---|---|
| bg-color-container | {color.grey.800} | `#141414` | `#ffffff` |
| bg-color-page | {color.grey.900} | `#000000` | `#f5f7fa` |
| bg-color-component | {color.grey.750} | `#262a33` | `#f2f4f7` |
| text-color-primary | {color.grey.0} | `#ffffff` | `#141414` |
| text-color-secondary | {color.grey.200} | `#f2f4f7` | `#676a72` |
| text-color-placeholder | {color.grey.500} | `#8f9195` | `#8f9195` |
| text-color-disabled | {color.grey.600} | `#676a72` | `#abadb2` |
| component-border | {color.grey.600} | `#676a72` | `#c8cad0` |
| component-stroke | {color.grey.725} | `#333740` | `#dfe1e8` |
| brand-color | {Primitives-Dark/color.blue.500} | `#0a84ff` | `#1450f5` |
| brand-color-hover | {Primitives-Dark/color.blue.600} | `#086acc` | `#4373f7` |
| brand-color-active | {Primitives-Dark/color.blue.400} | `#3b9dff` | `#1444c8` |
| brand-color-disabled | {Primitives-Dark/color.blue.700} | `#064f99` | `#a1b9fb` |
| brand-color-light | {Primitives-Dark/color.blue.900} | `#021a33` | `#f3f6fe` |
| brand-color-focus | {Primitives-Dark/color.blue.800} | `#043566` | `#d0dcfd` |
| brand-color-light-hover | {Primitives-Dark/color.blue.800} | `#043566` | `#d0dcfd` |
| brand-color-light-active | {Primitives-Dark/color.blue.700} | `#064f99` | `#a1b9fb` |
| brand-color-light-disabled | {Primitives-Dark/color.blue.900} | `#021a33` | `#f3f6fe` |
| text-color-brand | {Primitives-Dark/color.blue.500} | `#0a84ff` | `#1450f5` |
| text-color-link | {Primitives-Dark/color.blue.500} | `#0a84ff` | `#1450f5` |
| success-color | {Primitives-Dark/color.green.500} | `#1ed273` | `#1ed273` |
| success-color-hover | {Primitives-Dark/color.green.600} | `#16b662` | `#4bdb8f` |
| success-color-active | {Primitives-Dark/color.green.400} | `#4bdb8f` | `#16b662` |
| success-color-disabled | {Primitives-Dark/color.green.700} | `#0f9950` | `#8ceeba` |
| success-color-light | {Primitives-Dark/color.green.900} | `#03331a` | `#dbfbea` |
| success-color-focus | {Primitives-Dark/color.green.800} | `#14663b` | `#b2f5d2` |
| warning-color | {Primitives-Dark/color.orange.500} | `#ff9f0a` | `#f98600` |
| warning-color-hover | {Primitives-Dark/color.orange.600} | `#cc7f08` | `#ffb145` |
| warning-color-active | {Primitives-Dark/color.orange.400} | `#ffb23b` | `#d97019` |
| warning-color-disabled | {Primitives-Dark/color.orange.700} | `#995f06` | `#ffd18d` |
| warning-color-light | {Primitives-Dark/color.orange.900} | `#332002` | `#fff1db` |
| warning-color-focus | {Primitives-Dark/color.orange.800} | `#664004` | `#ffe1b3` |
| error-color | {Primitives-Dark/color.red-UI.500} | `#ff453a` | `#f51414` |
| error-color-hover | {Primitives-Dark/color.red-UI.600} | `#cc372e` | `#f74343` |
| error-color-active | {Primitives-Dark/color.red-UI.400} | `#ff6a61` | `#c41010` |
| error-color-disabled | {Primitives-Dark/color.red-UI.700} | `#992923` | `#fba1a1` |
| error-color-light | {Primitives-Dark/color.red-UI.900} | `#330e0b` | `#fef3f3` |
| error-color-focus | {Primitives-Dark/color.red-UI.800} | `#66231f` | `#fdd0d0` |

### Figma ↔ Web ↔ TDesign 等价映射

- Figma variable 是值与语义的唯一来源，名称保持不变
- Web Code Syntax 使用 `var(--token-name)`；Dimension 中的 `comp-paddingTB-*` / `comp-paddingLR-*` 映射为小写 CSS：`--comp-padding-tb-*` / `--comp-padding-lr-*`
- TDesign 名称仅作为消费端别名，例如 `Color/brand/brand-color` → `--brand-color` → `--td-brand-color`
- 只有语义一致时才映射到 TDesign；不存在对应项时直接使用 China Token CSS variable，不创建含义相近但不准确的别名
- `text/*` 与 `Color/text/*` 等价识别；`Color/grey/component-stroke` 是唯一有效描边名称

---

## 数据可视化配色（Data visualization）

Data Visualization 的唯一完整变量清单位于 `data-visualization.md` 的“Figma Variables 唯一事实来源”和“配色 Token”章节，本文件不维护重复色值副本。

- Figma collection：`Design Token China / Data visualization`
- 变量：102 个 `COLOR`
- Modes：Light、Dark、Brand Light、Brand Dark
- 分类：Theme 基础 2、Categorical 8、Text 5、Axes 3、Sequential 54、Sequential Adjacent 18、Diverging 9、Semantic 3
- 默认图表主题：Brand Light / Brand Dark
- 实现时必须引用共享图表 Token；禁止根据设计稿截图、ECharts 示例或本文件其他 UI Token 推导图表色值

---

## 基础色板（Primitives）— 仅供参考，开发不直接使用

### 品牌蓝（核心主色）
`#f8faff`(10) → `#f3f6fe`(50) → `#e7edfe`(70) → `#d0dcfd`(100) → `#a1b9fb`(200) → `#7296f9`(300) → `#4373f7`(400) → **`#1450f5`(500)** → `#1444c8`(600) → `#14389b`(700) → `#142c6e`(800) → `#142041`(900)

### 灰色系（UI 骨架色）
`#ffffff`(0) → `#fafbfc`(50) → `#f5f7fa`(100) → `#f2f4f7`(200) → `#eaecf1`(250) → `#dfe1e8`(300) → `#d5d7de`(350) → `#c8cad0`(400) → `#abadb2`(450) → `#8f9195`(500) → `#676a72`(600) → `#43464f`(700) → `#333740`(725) → `#262a33`(750) → `#1d1f26`(775) → `#141414`(800) → `#000000`(900)

### 品牌辅助色（Brand 2nd）
- Sand: `#f3eee6`
- Yellow: `#ffe141`
- Light Blue: `#d2f5ff`
- Pink: `#ffcdd7`
- Green: `#aae1c8`

---

## 自定义 Icon

所有 icon 均为 16×16 的 SVG symbol，来自 Figma 文件的 💰Icon 页面。使用时直接引用 icon 名称。

### Icon 使用规范
- 使用 icon 时，通过 Figma Power 的 `get_design_context` 工具读取对应节点，获取真实 SVG path 数据
- 将 SVG path **内联**到代码中，不使用 `<img>` 标签引用外部 URL（Figma URL 会过期）
- 使用 `fill="currentColor"` 或 `stroke="currentColor"`，通过 CSS `color` 属性控制颜色
- 尺寸通过 `width` / `height` 属性控制，`viewBox` 保持原始值不变

### 获取 Icon SVG 的方法
1. 在 Figma 里点击目标 icon，复制链接获取 node-id
2. 告知 Kiro icon 名称或 node-id
3. Kiro 调用 `get_design_context` 读取真实 SVG path
4. 将 path 内联到组件模板中

### Icon 列表

### 箭头类
`arrow-up` `arrow-down` `arrow-left` `arrow-right`
`arrow-up-left` `arrow-up-right` `arrow-down-left` `arrow-down-right`
`arrow-up-kone` `arrow-left-kone` `arrow-right-kone`
`chevron-up` `chevron-down` `chevron-left` `chevron-right`
`chevron-left2` `chevron-right2` `chevron-inwards` `chevron-outwards`
`chevron-left-circle` `chevron-right-circle` `chevron-right-circle-filled`
`caret-up-small` `caret-down-small` `caret-left-small` `caret-right-small`
`swap-1` `swap-2` `swap-left` `swap-right`
`forward` `forward-Left` `backtop-M` `backtop-L`
`page-first` `page-last`

### 基础操作类
`add` `add-circle` `add-circle-filled` `add-rectangle` `add-rectangle-filled`
`minus` `minus-circle` `minus-circle-filled` `minus-rectangle` `minus-rectangle-filled`
`close-M` `close-L` `close-circle` `close-circle-filled` `close-rectangle` `close-rectangle-filled`
`check` `check-circle` `check-circle-filled` `check-rectangle` `check-rectangle-filled`
`search` `search-filled` `filter` `hide` `show`
`delete` `edit` `copy` `copy-filled`
`upload` `download` `refresh-1` `refresh-2`
`more-1` `more-2` `list` `list-rectangle` `grid` `view-list`

### 状态/提示类
`warning` `warning-circle` `warning-circle-filled` `warning-triangle` `warning-triangle-filled`
`warning-rectangle` `warning-rectangle-filled`
`info` `info-filled`
`question` `question-circle` `question-circle-filled` `question-rectangle` `question-rectangle-filled`
`stop` `stop-sign` `stop play` `forbid`
`check-circle` `check-circle-filled`

### 电梯类
`elevator` `elevator-2` `elevator-filled`
`elevator-door` `elevator-door-open` `elevator-door-opening` `elevator-door-opening2`
`elevator-door-closing` `elevator-door-closing2` `elevator-door-closed`
`elevator-door-filded` `elevator-door-filded2`
`elevator-door-opening-filded2` `elevator-door-closing-filled1` `elevator-door-closing-filled2`
`elevator-group` `elevator-group-control`
`elevator-passenger` `elevator-VIP` `elevator-VIP-filled`
`elevator-idle` `elevator-maintenance` `elevator-maintenance-filled`
`elevator-cargo` `elevator-box`
`elevator-button` `elevator-exchange` `elevator-exchange-filled`
`escalator` `escalator1` `escalator1-filled` `escalator2-filled`
`Open the door` `Close the door`
`load speed`

### 设备/工具类
`dashboard-1` `dashboard-2` `dashboard-2-filled` `dashboard0` `dashboard0-filled`
`dashboard1-filled` `dashboard-3` `dashboard3-filled`
`setting` `setting-filled`
`server` `server-filled`
`maintenance` `maintenance-filled` `maintanence-2`
`toolbox` `equipment`
`battery` `battery-1` `battery-2` `battery-3` `battery-charge`
`bluetooth` `bluetooth2` `bluetooth2-filled`
`usb` `usb-filled`
`wifi` `wifi-filled` `wifi-lost1` `wifi-lost2`
`信号强弱=0` `信号强弱=1` `信号强弱=2` `信号强弱=3`
`drive` `drive-filled`
`keyboard` `mouse-1` `mouse-2`
`desktop` `Large screen` `mobile` `tv`
`headset` `microphone` `sound` `sound-filled` `sound-off`
`camera` `video` `cinema` `cinema-filed`
`vibration-vertical` `vibration-vertical2` `vibration-Horizonta` `vibration-Horizonta2`

### 角色类
`user` `user-filled` `user-add` `user-Delete`
`user-avatar` `user-circle` `user-cloud` `user-maintenance` `user-talk` `user-talk-filled` `user-data`
`usergroup` `usergroup-filled`
`sales` `sales-filled`
`smiley-happy` `smiley-happy-filled` `smiley-neutual` `smiley-sad` `smiley-frustrated` `smiley-like`

### 建筑类
`home` `home-filled` `house`
`officebuilding-1` `officebuilding-2`
`hospital-1` `hospital-2`
`mall` `school` `factory` `villa` `residence`
`affordable housing` `Comprehensive building`
`Public transport` `airport` `ship`
`Safety helmet`

### 文件/内容类
`document-1` `document-1-filled` `document-2`
`folder1` `folder1-filed` `folder2` `folder2-filed`
`image` `txt` `pdf`
`book` `bookmark` `bookmark-filled`
`report` `report2` `report2_new` `report-filled` `report2-filled`
`chart-1` `chart-1-filled` `chart-2`
`Pie chart-filed`
`layers` `layers-filed`
`tag` `tag-filed`

### 操作/交互类
`link` `link-unlink`
`share` `forward`
`pin` `pin-filled`
`flag1` `flag2` `flag2-filled`
`star` `star-filled` `star-half`
`heart` `good` `good-filled` `bad` `bad-filled`
`notification` `notification-filled`
`alarm` `clock`
`calendar` `calendar-filled`
`location` `location-filled`
`navigation` `navigation-filled`
`scan-1` `scan-2` `QR code-filled`
`Issue` `click` `click-filled1` `click-filled2`

### 开发/系统类
`code` `code-filled`
`node` `node-filled`
`fork` `app`
`layers` `layers-filed`
`project` `project-filled` `project-2`
`workflow` `workflow-filed`
`beta` `bias` `digit`
`current` `key` `key-filed` `lock-on` `lock-on-filled` `lock-off` `lock-off-filled`
`secured` `Internet` `internet-filled`
`cloud` `cloud-filled` `cloud-upload` `cloud-upload-filled` `cloud-download` `cloud-disconnected` `cloud-disconnected-filled`
`Language` `Language=English` `Language=Simplified Chinese` `Language=Traditional Chinese`
`navi_panel_left` `navi_panel_right` `navi_panel_close_left`

### 自然类
`sun` `sun-filled` `moon` `moon-filled`
`fire` `fire-filled`
`Water droplets` `Water droplets-filled`
`thermometer` `earthquake`
`wind` `windmill`

### 商业/金融类
`money-circle` `payment` `card` `card-filled`
`shop` `shopping_cart_empty` `shopping_cart_full`
`contract` `legal` `legal-2`
`sales` `sales-filled`

### 其他
`KONE`（品牌 logo）
`GiantKONE`（品牌 logo 大版）
`未注册` `离线` `在线` `一个在线一个离线`
`Registered`
`loading-blue` `loading-black`
`DT6` `DT6-filled`
`PrefixIcon`
`3 days` `day` `month`
`brush-clear`
`popup` `enter` `jump`
`music` `sample project` `overdue`
`measure` `truck`
`cup_rest_break`
`new_release_1`

---

## 插画（Illustration）

所有插画均为 200×200，来自 Figma 文件的 🎉 Illustration 页面，分浅色和深色两套，用于缺省页配图和装饰性元素。

### 使用规范
- 缺省页/空状态场景：根据具体情况选用对应语义的插画
- 浅色模式用 `-light` 版本，深色模式用 `-Dark` 版本

### 插画列表

| 名称（浅色） | 名称（深色） | 使用场景 |
|---|---|---|
| `无网络-light` | `无网络-Dark` | 无网络连接 |
| `无搜索结果-light` | `无搜索结果-Dark` | 搜索无结果 |
| `空状态-light` | `空状态-Dark` | 列表/页面为空 |
| `成功状态-light` | `成功状态-Dark` | 操作成功 |
| `失败状态-light` | `失败状态-Dark` | 操作失败 |
| `找不到服务器-light` | `找不到服务器-Dark` | 服务器错误/404 |
| `报告文件-light` | `报告文件-Dark` | 报告/文件相关 |
| `楼宇-light` | `楼宇-Dark` | 楼宇/建筑相关 |
| `拜访日历-light` | `拜访日历-Dark` | 日历/拜访相关 |

---

## 开发规范总结

1. **优先使用 China Token 语义化层**，不要直接写 Primitives 色值
2. **主色** `#1450f5`，按钮、链接、选中态统一用这个
3. **文字层级**：主要 `#141414` → 次要 `#676a72` → 占位符 `#8f9195` → 禁用 `#abadb2`
4. **背景层级**：页面 `#f5f7fa` → 容器/卡片 `#ffffff`
5. **圆角**：根据场景选用对应的 radius token，参考圆角规范章节
6. **间距**：严格使用基础尺寸单位（2的倍数，以4为主）
7. **字体**：系统字体，只规定字重（400/600）和行高，不指定字体名称
8. **Icon**：必须从 Figma Design System 获取真实 SVG path，内联使用，`fill="currentColor"`
9. **图表**：根据场景选用对应的 Data visualization 主题（Light/Dark/Brand Light/Brand Dark）
10. **深色模式**：切换 China Token/Dark，图表切换对应 Dark 主题

---

> **维护说明**：如需更新 Primitives 色值，只需在"Primitives 色板"章节修改对应的色值表。所有 China Token 通过 `{color.xxx.xxx}` 引用关系自动关联，只需同步更新 Token 表格中的色值列即可保持一致。
