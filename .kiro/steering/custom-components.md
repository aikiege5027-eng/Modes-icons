---
inclusion: always
---

# KONE China 自定义组件规范

本文件记录 TDesign 之外额外建立的自定义组件。所有组件基于 KONE China Design Token，遵循 `design-system-vue.md` 中的规范。

**组件文件目录**：`src/components/`
**展示站路由前缀**：`#/components/[组件名]`

---

## 如何新增组件

1. 把 Figma 组件链接发给 Kiro（右键 → Copy link 获取 node-id）
2. Kiro 读取设计数据，生成以下文件：
   - `src/components/[ComponentName].vue` — 可复用组件
   - `src/components/[ComponentName]Content.vue` — 展示文档页（布局见下方规范）
3. 在 `src/router/index.ts` 的 `children` 里注册路由
4. 在 `src/components/ComponentsLayout.vue` 的 `navItems` 数组里追加导航项
5. 在本文件补充该组件的规范记录

---

## 展示页布局规范

所有组件的展示文档页（`*Content.vue`）统一使用以下布局，参考 TDesign 文档页风格。

### 整体结构

```
doc-layout（flex row）
├── doc-main（flex: 1，内容区）
│   ├── doc-header（页面标题、描述、Figma 来源）
│   ├── doc-section#[id]（各展示区块，可锚点跳转）
│   └── ...
└── anchor-nav（右侧锚点导航，240px）
```

### 布局 CSS 规范

```css
/* 整体 flex 横排 */
.doc-layout {
  display: flex;
  align-items: flex-start;
  min-height: 100vh;
}

/* 内容区：自适应拉宽，内部段落 max-width: 1100px 居中 */
.doc-main {
  flex: 1;
  min-width: 0;
  padding: 48px clamp(24px, 4vw, 80px) 96px;
}
.doc-header,
.doc-section {
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
}

/* 锚点：内容宽 240px，左侧 margin 24px，右侧 margin 32px */
.anchor-nav {
  flex-shrink: 0;
  width: 240px;
  position: sticky;
  top: 72px;
  align-self: flex-start;
  max-height: calc(100vh - 88px);
  overflow-y: auto;
  padding-top: 48px;
  padding-bottom: 48px;
  margin-left: 24px;
  margin-right: 32px;
}

/* 响应式：< 1000px 隐藏锚点 */
@media (max-width: 1000px) {
  .anchor-nav { display: none; }
}
@media (max-width: 768px) {
  .doc-main { padding: 32px 20px 64px; }
}
```

### 锚点竖线样式（TDesign 同款）

```css
.anchor-nav__list {
  position: relative;
  padding-left: 1px;
}
.anchor-nav__list::before {
  content: '';
  position: absolute;
  left: 0; top: 0;
  width: 1px; height: 100%;
  background: var(--component-stroke);
}
.anchor-nav__item {
  display: block;
  position: relative;
  font-size: 13px;
  color: var(--text-color-secondary);
  text-decoration: none;
  padding: 5px 0 5px 16px;
  line-height: 20px;
  transition: color 0.15s;
}
.anchor-nav__item--active {
  color: var(--brand-color);
  font-weight: 500;
}
.anchor-nav__item--active::before {
  content: '';
  position: absolute;
  left: -1px; top: 0;
  width: 1px; height: 100%;
  background: var(--brand-color);
}
```

### 展示文档页标准 section 结构

每个组件的展示页至少包含以下锚点 section：

| section id | 标题 | 内容 |
|---|---|---|
| `size` | 尺寸 Size | 各尺寸变体展示 |
| `state` | 状态 State | Normal/Hover/Active/Disabled |
| `usage` | 使用方式 Usage | 代码示例 |
| `props` | Props | Props 说明表格 |
| `events` | Events | Events 说明表格（如有） |

### 导航注册方式

新增组件后需同步更新两处：

**`src/router/index.ts`**：
```ts
// 在 children 数组里追加
{ path: '[component-name]', name: '[component-name]', component: [ComponentName]Content },
```

**`src/components/ComponentsLayout.vue`**：
```ts
const navItems = [
  { name: 'Button Hero', path: '/components/button-hero' },
  // 在此追加新组件
  { name: '[组件名]', path: '/components/[component-name]' },
]
```

---

## ButtonHero — 英雄按钮

### 概述

**Figma 来源**：`b5cc1y3jzLmOQkpa8vz5AX`，node-id `30945:4124`
**代码文件**：`src/components/ButtonHero.vue`
**展示页面**：`https://sherryfan326-kone.github.io/Design-System/#/button-hero`
**适用场景**：Hero 区域、落地页、营销页等需要视觉突出的主要行动按钮

### 组件结构

```
ButtonHero
├── 左侧（btn-hero__left）
│   ├── 前缀 icon（arrow-right，随尺寸缩放）
│   └── 文字标签（label prop）
└── 右侧圆形（btn-hero__circle）
    └── arrow-right icon（白色圆圈内，品牌色图标）
```

### 视觉规范

**整体**
- 形状：胶囊形（设计语义 `50%`；Web 使用 `border-radius: var(--radius-circle)`，实际值 `9999px`，不得直接写 `50%`）
- 背景：`brand-color`（`#1450f5`）
- 文字颜色：`text-color-white`（`#ffffff`）
- 字重：Semibold（`font-weight: 600`）
- 右侧圆圈背景：`bg-color-container`（`#ffffff`）

**尺寸规格**

| Size | 高度 | 左内边距 | 右内边距 | gap | 前缀icon | 圆圈 | 圆圈内icon | 字号/行高 |
|---|---|---|---|---|---|---|---|---|
| medium | 48px | 16px | 6px | 10px | 16px | 36px | 16px | 18px / 26px |
| big | 64px | 20px | 8px | 12px | 20px | 44px | 20px | 20px / 28px |
| extra-big | 72px | 24px | 12px | 16px | 24px | 48px | 24px | 22px / 32px |

**交互状态**

| 状态 | 背景色 | Token |
|---|---|---|
| Normal | `#1450f5` | `brand-color` |
| Hover | `#4373f7` | `brand-color-hover` |
| Active | `#1444c8` | `brand-color-active` |
| Disabled | `#a1b9fb` | `brand-color-disabled` |

> 圆圈内 icon 颜色在 hover/active/disabled 状态下同步跟随背景色变化

**Icon**：
- 左侧前缀：cloud（`vuD3onrb6PS5UtMrGdgbrA` node `612:941`），SVG viewBox `0 0 14 10`，`fill="currentColor"`
- 右侧圆圈：arrow-right（`vuD3onrb6PS5UtMrGdgbrA` node `612:883`），SVG viewBox `0 0 16 16`，`fill="currentColor"`

### 使用方式

```vue
<!-- 引入 -->
import ButtonHero from '@/components/ButtonHero.vue'

<!-- 基础用法（默认 medium） -->
<ButtonHero label="Get started" />

<!-- 指定尺寸 -->
<ButtonHero size="big" label="Learn more" />
<ButtonHero size="extra-big" label="Explore now" />

<!-- 禁用状态 -->
<ButtonHero state="disabled" label="Unavailable" />

<!-- 监听点击 -->
<ButtonHero label="Get started" @click="handleClick" />
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `label` | `string` | `'Button'` | 按钮文字 |
| `size` | `'medium' \| 'big' \| 'extra-big'` | `'medium'` | 尺寸，对应 48 / 64 / 72px 高度 |
| `state` | `'normal' \| 'hover' \| 'active' \| 'disabled'` | `'normal'` | 按钮状态；hover/active 也可由鼠标事件自动触发 |

### Events

| Event | 说明 |
|---|---|
| `click` | 按钮点击，disabled 状态下不触发 |

### 不可随意修改的部分

- 圆圈形状（必须为正圆，不可改为圆角矩形）
- 右侧圆圈背景色（始终为白色 `#ffffff`）
- 各尺寸的高度和内边距（来自 Figma 精确标注）
- Token 色值（所有颜色必须引用 CSS 变量）

---

## BackTopFab — 悬浮操作按钮

### 概述

**Figma 来源**：`b5cc1y3jzLmOQkpa8vz5AX`，node-id `27452:3311`
**代码文件**：`src/components/BackTopFab.vue`
**展示页面**：`https://sherryfan326-kone.github.io/Design-System/#/components/back-top-fab`
**适用场景**：移动端页面右下角固定悬浮按钮，每个产品页面只使用一个

### 组件结构

```
BackTopFab（variant="back"）
├── 白色圆圈（fab__circle，32×32px）
│   └── arrow-left icon（32×32 坐标系）
└── 文字标签（fab__label）

BackTopFab（variant="top"）
├── backtop-M icon（fab__top-icon，16×16px，白色）
└── 文字标签（fab__label）
```

### 视觉规范

**整体**
- 形状：左半圆右直角（`border-radius: 100px 0 0 100px`），贴屏幕右边缘放置
- 高度：固定 `48px`
- 背景：`brand-color`（`#1450f5`）
- 文字：`text-color-white`，18px / 600 / 26px
- 阴影：Drop Shadow/M（`0 0 1px rgba(20,20,20,0.06), 0 10px 15px -3px rgba(20,20,20,0.1), 0 4px 6px -2px rgba(20,20,20,0.05)`）

**两种 variant 规格**

| variant | padding | gap | 左侧元素 | 圆圈尺寸 |
|---|---|---|---|---|
| `back` | `8px` 四边 | `6px` | 白色圆圈（内含 arrow-left） | 32×32px |
| `top` | `10px 8px 10px 16px` | `4px` | backtop-M icon（无圆圈） | — |

**交互状态**

| 状态 | 背景色 | Token |
|---|---|---|
| Normal | `#1450f5` | `brand-color` |
| Hover | `#4373f7` | `brand-color-hover` |
| Active | `#1444c8` | `brand-color-active` |
| Disabled | `#a1b9fb` | `brand-color-disabled`，无阴影 |

**Icon**：
- `back` 圆圈内：arrow-left，32×32 坐标系，`fill="#141414"`（深色，在白圈内）
  - 来源：`b5cc1y3jzLmOQkpa8vz5AX` node `27452:3313`
- `top` icon：backtop-M，16×16 坐标系，`fill="currentColor"`（白色）
  - 来源：`b5cc1y3jzLmOQkpa8vz5AX` node `27452:3317`

> **注意**：prop 名用 `variant`，不可用 `style`（Vue/HTML 保留字，会与内联样式冲突）

### 使用方式

```vue
import BackTopFab from '@/components/BackTopFab.vue'

<!-- 返回顶部（默认） -->
<BackTopFab label="Top" />

<!-- 返回上一页 -->
<BackTopFab variant="back" label="Back" />

<!-- 禁用状态 -->
<BackTopFab state="disabled" label="Top" />

<!-- 贴屏幕右下角（推荐用法） -->
<BackTopFab
  variant="top"
  label="Top"
  @click="scrollToTop"
  style="position: fixed; bottom: 24px; right: 0;"
/>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `variant` | `'back' \| 'top'` | `'top'` | 样式：back 左侧有白色圆圈，top 直接显示 icon |
| `state` | `'normal' \| 'hover' \| 'active' \| 'disabled'` | `'normal'` | 按钮状态，hover/active 也可由鼠标自动触发 |
| `label` | `string` | `'Top'` | 按钮文字 |

### Events

| Event | 说明 |
|---|---|
| `click` | 按钮点击，disabled 状态下不触发 |

### 不可随意修改的部分

- `border-radius: 100px 0 0 100px`（左半圆右直角，贴边形态）
- `back` 变体圆圈背景色（始终白色）
- 阴影（Drop Shadow/M，disabled 状态下去掉）
- Token 色值（所有颜色必须引用 CSS 变量）
- prop 名必须是 `variant`，不可改回 `style`

---

## Footer — 邮件页脚

### 概述

**Figma 来源**：`b5cc1y3jzLmOQkpa8vz5AX`，node-id `31586:10472`
**代码文件**：`src/components/Footer.vue`
**展示页面**：`https://sherryfan326-kone.github.io/Design-System/#/components/footer`
**适用场景**：邮件模板页脚，包含 KONE logo、版权信息、链接和 Tagline

### 组件结构

```
Footer
├── footer__logo（KONE wordmark SVG，82×32）
└── footer__bottom
    ├── footer__texts
    │   ├── footer__links（链接列表，| 分隔）
    │   ├── footer__copyright
    │   └── footer__site-link
    └── footer__tagline（Tagline 图片，141×48）
```

### 视觉规范

**字体**：**Inter**（`font-family: 'Inter', 'Inter:Regular', Arial, sans-serif`），12px / Regular / line-height 16px
> ⚠️ 此组件特别使用 Inter，不遵循 Design System 的系统字体规范

**两种 variant**

| variant | 背景 | 文字/链接 | Logo 颜色 |
|---|---|---|---|
| `brand` | `#1450f5` | 白色，链接有下划线 | 白色 |
| `neutral` | `#ffffff` | 正文深色，链接品牌色无下划线 | 品牌蓝 `#1450f5` |

**两种 screenSize 布局**

| screenSize | 布局 | 文字区域 |
|---|---|---|
| `desktop` | 横排（texts + tagline 并排） | `flex: 1` 自适应 |
| `mobile` | 竖排（texts 在上，tagline 右下） | 全宽 |

**整体 padding**：32px 上下，24px 左右；gap 48px（logo 与底部内容之间）

**Tagline 资源**：`src/assets/kone-tagline.svg`，141×48，白色路径（两种 variant 共用）

### 使用方式

```vue
import Footer from '@/components/Footer.vue'

<!-- 默认（brand + desktop）-->
<Footer />

<!-- Neutral + Mobile -->
<Footer variant="neutral" screenSize="mobile" />

<!-- 自定义链接 -->
<Footer
  variant="brand"
  :links="[
    { text: 'Support', href: 'https://...' },
    { text: 'Privacy', href: 'https://...' },
  ]"
  siteUrl="https://www.kone.com"
  siteText="KONE.com"
/>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `variant` | `'brand' \| 'neutral'` | `'brand'` | 配色 |
| `screenSize` | `'mobile' \| 'desktop'` | `'desktop'` | 布局 |
| `links` | `Array<{text, href}>` | Support / Terms / Privacy | 底部链接列表 |
| `siteUrl` | `string` | `'#'` | 网站链接 href |
| `siteText` | `string` | `'KONE.be'` | 网站链接文字 |

### 不可随意修改的部分

- 字体必须是 Inter（不可替换为系统字体）
- brand 变体链接有下划线；neutral 变体链接无下划线但用品牌色
- Tagline 图片尺寸（141×48px）
- logo 颜色随 variant 自动切换（白色/品牌蓝）

---

## Accordion — 折叠面板

### 概述

**Figma 来源**：`b5cc1y3jzLmOQkpa8vz5AX`，node-id `27449:2417`（单个）/ `27449:2895`（Group）
**代码文件**：`src/components/Accordion.vue` + `src/components/AccordionGroup.vue`
**展示页面**：`https://sherryfan326-kone.github.io/Design-System/#/components/accordion`
**适用场景**：FAQ、设置面板、内容折叠等需要展开/收起的场景

### 组件结构

```
Accordion
├── accordion__header（button）
│   ├── accordion__label（标题文字）
│   └── accordion__btn（白色圆形，36×36px）
│       └── chevron icon（collapsed 深色向下 / expanded 品牌蓝向上）
└── accordion__content（v-if="isExpanded"）
    └── <slot>（插入自定义内容）

AccordionGroup
└── Accordion × N（item 之间有 1px 分隔线）
```

### 视觉规范

**外容器**
- 背景：`brand-color-light`（`#f3f6fe`）
- 圆角：`16px`
- padding：`24px`
- gap：`12px`（collapsed）/ `24px`（expanded）

**Header**
- label：18px / Regular / `text-color-primary`，`line-height: 26px`
- 圆形按钮：`36×36px`，`border-radius: 102px`，背景 `bg-color-container`（白色），padding `8px`，icon `20px`

**Chevron Icon（20×20 viewBox）**

| 状态 | 方向 | 颜色 | 来源 |
|---|---|---|---|
| Collapsed | 向下 | `#141414` | Figma node `I27449:2421` |
| Expanded | 向上 | `#1450f5`（brand-color） | Figma node `I27449:2425` |

**Group 分隔线**：`1px`，`component-stroke`

### 使用方式

```vue
import Accordion from '@/components/Accordion.vue'
import AccordionGroup from '@/components/AccordionGroup.vue'

<!-- 单独使用 -->
<Accordion label="Section Title">
  <p>Content goes here</p>
</Accordion>

<!-- v-model 控制展开状态 -->
<Accordion label="Section Title" v-model:expanded="isOpen">
  <p>Content goes here</p>
</Accordion>

<!-- Group：手风琴模式（exclusive=true 每次只展开一个）-->
<AccordionGroup
  :items="[
    { label: 'Item 1', content: 'Content 1' },
    { label: 'Item 2', content: 'Content 2' },
  ]"
  :exclusive="true"
/>

<!-- Group 具名 slot -->
<AccordionGroup :items="items">
  <template #item-0>
    <p>Custom content for item 0</p>
  </template>
</AccordionGroup>
```

### Props — Accordion

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `label` | `string` | `'This is an accordion label'` | Header 标题文字 |
| `expanded` | `boolean` | `false` | 是否展开，支持 `v-model:expanded` |

### Props — AccordionGroup

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `items` | `AccordionItem[]` | — | 列表数据，含 `label`、`content`（可选）、`expanded`（可选） |
| `exclusive` | `boolean` | `false` | 手风琴模式，每次只展开一个 |

### Events

| 组件 | Event | 说明 |
|---|---|---|
| Accordion | `update:expanded` | 展开状态变化，用于 `v-model:expanded` |
| Accordion | `toggle` | 点击 header 触发，参数为新的展开状态 |
| AccordionGroup | `toggle` | 某 item 状态变化，参数为 `(index, expanded)` |

### 不可随意修改的部分

- 外容器背景色（`brand-color-light`）和圆角（`16px`）
- 圆形按钮尺寸（`36px`）和背景（白色）
- Chevron 颜色：collapsed 深色、expanded 品牌蓝
- 内容通过 slot 插入，不在组件内硬编码

---

## Loading / Spinner — 加载指示器

### 概述

**Figma 来源**：`b5cc1y3jzLmOQkpa8vz5AX`，node-id `27430:1360`
**代码文件**：`src/components/Loading.vue`
**展示页面**：`https://sherryfan326-kone.github.io/Design-System/#/components/loading`
**适用场景**：按钮 loading 态、页面/区域加载中状态

### 视觉规范

- 尺寸：默认 24×24px，支持任意 px 等比缩放
- 结构：圆环背景（`bg` path）+ 约 3/4 弧形进度（`arc` path）
- 动画：`@keyframes spin`，360° 旋转，1s 线性无限循环

**4 种颜色主题**

| theme | 背景 path 颜色 | 弧形 path 颜色 | 使用场景 |
|---|---|---|---|
| `white-bg` | `#d0dcfd`（brand-color-focus） | `#1450f5`（brand-color） | 白色/浅色背景（White BG） |
| `blue-bg` | `#4373f7`（brand-color-hover） | `#ffffff` | 浅蓝背景（Baby blue BG，`brand-color-light` `#f3f6fe`） |
| `dark` | `#4373f7`（brand-color-hover） | `#ffffff` | KONE 品牌蓝背景 `#1450f5`（KONE blue BG） |
| `destructive` | `#fef3f3`（error-color-light） | `#f74343`（error-color-hover） | 错误/危险状态（Destructive BG） |

### 使用方式

```vue
import Loading from '@/components/Loading.vue'

<!-- 默认（white-bg，24px）-->
<Loading />

<!-- 主题 -->
<Loading theme="blue-bg" />
<Loading theme="destructive" />

<!-- 自定义尺寸 -->
<Loading :size="32" />

<!-- 按钮 loading 态 -->
<button :disabled="loading">
  <Loading v-if="loading" theme="blue-bg" :size="20" />
  <span>{{ loading ? 'Loading...' : 'Submit' }}</span>
</button>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `theme` | `'white-bg' \| 'blue-bg' \| 'dark' \| 'destructive'` | `'white-bg'` | 颜色主题 |
| `size` | `number` | `24` | 尺寸（px），等比缩放 |
| `label` | `string` | `'Loading'` | 无障碍标签（aria-label） |

### 不可随意修改的部分

- SVG path 来自 Figma 精确路径，不可手绘替代
- 动画时长（1s）和缓动（linear）保持一致
- 颜色必须使用上表中的精确色值（不用 token 变量，因为这是 Figma 设计稿指定的特殊配色）

<!-- 后续新增组件在此追加，格式同上 -->
