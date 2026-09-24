---
name: page-templates
description: KONE China 页面模板规范库（基于 TDesign Vue Next + China Design Token）。收录 4 个登录页模板（标准账密、SSO 单点、图形验证码、多方式登录）与 3 个导航页模板（侧边导航、顶部 Tab 导航、顶部菜单导航）的结构、视觉规范与可替换部分。当需要新建或修改登录页、导航页/框架页，或用户提到页面模板、模板一/二/三/四、登录卡片、SSO 登录、验证码登录、侧边栏导航、顶部 Tab、Head Menu、page-templates 时使用。
---

# KONE China 页面模板规范

本文件记录已建立的页面模板，供设计师引用和修改。所有模板基于 TDesign Vue Next + KONE China Design Token，遵循 `design-system-vue.md` 中的规范。

参考展示网站：https://sherryfan326-kone.github.io/Design-System/

---

## 登录页卡片模板

### 通用结构规范

所有登录页共享同一套卡片结构和视觉规范：

**页面布局**
- 全屏背景图（`position: fixed`，`background-size: cover`）
- 登录卡片居中浮于背景上方（`z-index: 1`）

**卡片规格**
- 宽度：`440px`，小屏自适应（`max-width: calc(100vw - 48px)`）
- 内边距：`40px`
- 圆角：`24px`（大于 token 标准值，登录场景专用）
- 背景色：`bg-color-container`（`#ffffff`）
- 阴影：`0 8px 40px rgba(0, 0, 0, 0.12)`
- 内部分区间距：`gap: 32px`

**卡片 Header**
- Logo + 标题垂直排列，左对齐，`gap: 24px`
- Logo：宽 `72px`，高 `28px`
- 标题：H3 28/Semibold（`font-size: 28px`，`font-weight: 600`，`line-height: 36px`，`color: text-color-primary`）

**输入框规范**
- 高度：`40px`（TDesign `size="large"`）
- 圆角：`8px`（`radius-large`）
- 默认边框：`component-border`（`#c8cad0`）
- Hover 边框：`brand-color`（`#1450f5`）
- Focus 边框：`brand-color` + `box-shadow: 0 0 0 3px rgba(20, 80, 245, 0.1)`
- Error 边框：`error-color`（`#f51414`）
- 报错文字：`font-size: 12px`，`color: error-color`，左对齐，输入框下方 `gap: 4px`
- **注意**：密码输入框因 TDesign slot 限制，使用原生 `<input>` + 自定义 wrapper 实现，样式与 TDesign `t-input` 保持一致

**主按钮规范**
- 组件：TDesign `<t-button theme="primary" size="large" shape="round">`
- 高度：`40px`，圆角为全圆语义 `50%`；Web 使用 `var(--radius-circle)`（`9999px`，pill 形），不得直接写 `50%`
- 背景：`brand-color`（`#1450f5`），文字：`text-color-white`
- Hover：`brand-color-hover`（`#4373f7`）
- Active：`brand-color-active`（`#1444c8`）
- Disabled：`brand-color-disabled`（`#a1b9fb`）
- 字号：H7 16/Semibold（`font-size: 16px`，`font-weight: 600`）

**次要按钮规范**（SSO 跳转等）
- 背景：`brand-color-light`（`#f3f6fe`），文字：`brand-color`（`#1450f5`）
- 圆角：全圆语义 `50%`，Web 使用 `var(--radius-circle)`（`9999px`）；高度：`40px`
- Hover：`brand-color-light-hover`（`#d0dcfd`）

---

### 模板一：标准用户名密码登录

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/
**代码文件**：`src/components/LoginPage.vue`

**卡片内容结构**
```
登录卡片
├── Header：Logo + 标题
└── 表单
    ├── 输入框组（gap: 24px）
    │   ├── 用户名输入框（t-input）
    │   └── 密码输入框（原生 input + show/hide icon）
    └── 操作组（gap: 16px）
        ├── Remember me（t-checkbox）
        ├── Log In 主按钮（全宽）
        └── Forgot password 链接（居中）
```

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 背景图 | 修改 `.login-bg` 的 `background-image` |
| Logo | 替换 `<img>` 的 `src` |
| 标题文字 | 修改 `login-title` 的文本内容 |
| 用户名字段 | 修改 `placeholder` 和 `v-model` 绑定 |
| 按钮文字 | 修改 `<t-button>` 内文本 |
| 增加输入字段 | 在 `inputs-group` 内复制 `field-group` 结构 |
| 去掉 Remember me | 删除 `t-checkbox` 所在行 |
| 去掉忘记密码 | 删除 `forgot-row` |

---

### 模板二：SSO 单点登录

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/amp
**代码文件**：`src/components/LoginPageAMP.vue`
**适用场景**：企业内部系统、AMP 等通过第三方账号登录的场景

**卡片内容结构**
```
登录卡片
├── Header：Logo + 标题（支持多行，如"Welcome！/ App Name"）
└── 操作区（gap: 24px）
    ├── 主按钮（"Log in with KONE Account"，全宽）
    └── Privacy Policy 勾选（t-checkbox + t-link）
```

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 标题 | 支持多行，修改 `login-title` 内的 `<p>` 文本 |
| 按钮文字 | 修改 SSO 按钮文本，如"Log in with Google" |
| Privacy Policy 链接 | 修改 `href` 和链接文字 |
| 去掉 Privacy Policy | 删除 `policy-row` 整块 |

---

### 模板三：用户名密码 + 图形验证码

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/verify
**代码文件**：`src/components/LoginPageVerify.vue`
**适用场景**：需要防机器人验证的登录场景

**卡片内容结构**
```
登录卡片
├── Header：Logo + 标题
└── 表单
    ├── 输入框组（gap: 24px）
    │   ├── 用户名输入框
    │   ├── 密码输入框（原生 input + show/hide icon）
    │   └── 验证码行
    │       ├── 验证码输入框（flex: 1）
    │       └── 图形验证码（120px，点击刷新）
    └── 操作组
        └── Log In 主按钮（全宽）
```

**验证码组件规范**
- 宽度：`120px`，高度：`40px`，圆角：`8px`
- 背景：`bg-color-component-hover`（`#dfe1e8`）
- 验证码字符：`font-size: 28px`，`letter-spacing: 2px`，`color: text-color-placeholder`
- 点击刷新，有 hover 透明度变化

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 验证码类型 | 当前为前端随机数字，可对接后端图形验证码 API |
| 验证码样式 | 替换 `.captcha-img` 为真实图片 `<img>` |

---

### 模板四：多方式登录（手机/邮箱/SSO）

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/multi
**代码文件**：`src/components/LoginPageMulti.vue`
**适用场景**：面向个人用户、需要支持多种登录方式的场景

**卡片内容结构**
```
登录卡片
├── Header：Logo + 标题
└── 登录体（根据 loginMode 切换）
    ├── 手机/邮箱模式
    │   ├── Radio 切换组（Phone Login / Email Login）
    │   ├── 手机登录表单
    │   │   ├── 手机号行（区号下拉 + 手机号输入框）
    │   │   ├── 验证码行（输入框 + Send 按钮，60s 倒计时）
    │   │   ├── Log In 主按钮
    │   │   ├── Privacy Policy 勾选
    │   │   └── 分割线
    │   ├── 邮箱登录表单（结构同手机，字段替换）
    │   └── Log In with KONE SSO 次要按钮
    └── SSO 模式（点击次要按钮后进入）
        ├── Log in with KONE SSO 主按钮
        ├── Privacy Policy 勾选
        └── ← Back to login 返回链接
```

**Send 按钮规范**
- 宽度：`120px`，高度：`40px`，圆角：`8px`
- 默认：边框 `brand-color`，文字 `text-color-brand`，背景透明
- Hover：背景 `brand-color-light`
- Disabled（倒计时中）：边框 `component-border`，文字 `text-color-disabled`

**区号下拉规范**
- 高度：`40px`，圆角：`8px`，边框 `component-border`
- 下拉列表：`max-height: 240px`，可滚动
- 选中项：背景 `brand-color-light`，文字 `brand-color`

**Radio 切换组规范**
- 整体背景：`component-stroke`（`#dfe1e8`），圆角：`radius-default`（`4px`）
- 激活项：背景 `bg-color-container`，文字 `text-color-primary`
- 未激活：背景透明，文字 `text-color-secondary`

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 登录方式 | 去掉不需要的 tab，修改 `loginMode` 类型定义 |
| 区号列表 | 修改 `countryCodes` 数组 |
| SSO 按钮文字 | 修改 `kone-account-btn` 文本 |
| 倒计时时长 | 修改 `startCountdown` 中的初始值（默认 60s） |
| 去掉 SSO 入口 | 删除 `kone-account-btn` 和 `divider-row` |

---

## 使用说明

### 如何基于模板创建新页面

1. 告诉 Kiro 要用哪个模板，例如：
   - "参考模板一，帮我创建一个 XXX 系统的登录页"
   - "基于多方式登录模板，去掉邮箱登录，只保留手机和 SSO"

2. 说明需要替换的部分，例如：
   - 背景图换成 XXX
   - 标题改为"Welcome to XXX"
   - 去掉 Remember me

3. Kiro 会直接生成符合设计规范的代码，无需重复说明 Token 和组件规范。

### 模板不可随意修改的部分

以下内容是设计系统规范的一部分，修改时需同步更新 `design-system-vue.md`：

- 卡片圆角（24px）和阴影
- 主按钮的颜色和交互状态
- 输入框的 focus/error 样式
- Token 色值（所有颜色必须引用 CSS 变量）

---

## 导航页模板

### 通用规范

三个导航模板共享同一套顶部导航栏结构：

**顶部导航栏（56px 固定）**
- 背景：`bg-color-container`，底部边框：`component-stroke`
- 左侧：KONE logo（`src/assets/kone-logo.svg`，高 28px）+ App Name（H6 18/Semibold，`text-color-primary`）
- 右侧：4 个图标按钮（search / language / notification / user），颜色 `text-color-brand`，hover 背景 `brand-color-light`
- 图标全部来自 Design System（`src/assets/icons/iconPaths.ts`），使用 `v-html` 内联 SVG

**页面背景**：`bg-color-page`（`#f5f7fa`）

---

### 模板一：侧边导航（Sidebar）

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/nav
**代码文件**：`src/components/NavigationPage.vue`
**适用场景**：功能复杂、菜单层级多（最多三级）的管理后台

**页面布局**
```
顶部导航栏（fixed，56px）
├── 侧边栏（fixed，232px 展开 / 64px 收起）
│   ├── 菜单区域（可滚动）
│   │   ├── 一级菜单（带 prefix icon，可展开）
│   │   ├── 二级菜单（缩进 44px，可展开）
│   │   └── 三级菜单（缩进 72px，叶子节点，选中高亮）
│   └── 底部：折叠/展开按钮（view-list icon）
└── 内容区（margin-left: 232px / 64px，padding: 24px）
    └── 白色卡片（border-radius: radius-medium）
```

**菜单 prefix icon**
- 使用 Design System 的 `server` icon（或其他 icon，从 `iconPaths.ts` 取）
- 尺寸 20px，颜色跟随菜单项 `currentColor`

**菜单状态颜色**
| 状态 | 背景 | 文字 |
|---|---|---|
| 默认 | 透明 | `text-color-secondary` |
| 展开中 | 透明 | `text-color-primary` |
| Hover | `bg-color-container-hover` | `text-color-primary` |
| 选中 | `brand-color-light` | `brand-color` |

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 菜单数据 | 修改 `menuItems` 数组 |
| 默认展开项 | 修改 `expanded` 初始值 |
| 默认选中项 | 修改 `activeKey` 初始值 |
| 菜单 icon | 将 `icons.server` 替换为 `iconPaths.ts` 中的其他 icon |
| 内容区内容 | 替换 `.content-card` 内部结构 |

---

### 模板二：顶部 Tab 导航（Top Nav Tabs）

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/nav-top
**代码文件**：`src/components/TopNavPage.vue`
**适用场景**：模块较少（3-6个）、平级切换为主的系统

**页面布局**
```
顶部导航栏（fixed，56px）
├── 左侧：Logo + App Name
├── 中间：水平 Tab 导航（绝对居中，gap: 48px）
└── 右侧：4 个操作图标
内容区（纯白背景，margin-top: 56px，无 padding）
```

**Tab 状态规范**
| 状态 | 文字颜色 | 底部描边 | 字重 |
|---|---|---|---|
| 默认 | `text-color-primary` | 无 | 400（Regular） |
| Hover | `text-color-primary` | `brand-color-hover`（2px） | 400 |
| 选中 | `brand-color` | `brand-color`（2px） | 600（Semibold） |

**下拉箭头**：使用 Design System `chevronDown` icon，`transform: scale(1.125)`

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| Tab 数量和标签 | 修改 `navItems` 数组 |
| 默认选中 | 修改 `activeNav` 初始值 |
| 带下拉箭头的 Tab | 在对应 item 设置 `hasDropdown: true` |
| 内容区 | 替换 `.page-content` 内部结构 |

---

### 模板三：顶部菜单导航（Head Menu）

**参考页面**：https://sherryfan326-kone.github.io/Design-System/#/nav-header
**代码文件**：`src/components/HeaderMenuPage.vue`
**适用场景**：模块适中（5-8个）、有二级内容、无需侧边栏的系统

**实现方式**：使用 TDesign 原生 `<t-head-menu>` + `<t-submenu>` + `<t-menu-item>`，`expand-type="popup"` 下拉弹出

**页面布局**
```
t-head-menu（fixed，56px）
├── #logo slot：KONE Logo
├── 菜单项（t-menu-item / t-submenu）
│   ├── 普通项：t-menu-item（带 prefix icon）
│   └── 有子菜单项：t-submenu（popup 下拉）
│       └── 子项：t-menu-item
└── #operations slot：4 个操作图标
内容区（纯白背景，margin-top: 56px）
```

**菜单项规范**
- 高度：`32px`，`padding: 5px 12px`，`border-radius: radius-default`
- prefix icon：来自 `iconPaths.ts`，16px，颜色 `currentColor`
- logo 与第一个菜单项间距：`24px`（覆盖 TDesign 默认 48px）

**选中/展开态**
- 选中 / 展开中：背景 `brand-color-light`，文字 `brand-color`，`border-radius: radius-medium`

**下拉面板规范**
- 背景 `bg-color-container`，边框 `0.5px solid component-border`
- 圆角 `radius-medium`，阴影 `0 4px 10px rgba(0,0,0,0.1)`
- 内边距 `6px`，子项高度 `28px`，`padding: 3px 8px`

**可替换部分**
| 元素 | 替换方式 |
|---|---|
| 菜单项数量 | 增减 `t-menu-item` / `t-submenu` |
| 默认选中 | 修改 `activeMenu` 初始值 |
| 默认展开 | 修改 `expanded` 初始值 |
| 菜单 icon | 将 `icons.layers` 替换为 `iconPaths.ts` 中的其他 icon |
| 有子菜单的项 | 用 `t-submenu` 包裹，在内部放 `t-menu-item` |
| 内容区 | 替换 `.page-content` 内部结构 |

---

## 导航模板使用说明

### 如何选择导航模板

| 场景 | 推荐模板 |
|---|---|
| 菜单多（>8项）、有层级、需要树形导航 | 侧边导航 |
| 模块少（≤6个）、平级切换、无层级 | 顶部 Tab 导航 |
| 模块适中（5-8个）、有二级菜单、不需要侧边栏 | 顶部菜单导航 |

### 如何基于导航模板创建新页面

1. 告诉 Kiro 要用哪个导航模板，例如：
   - "用侧边导航模板，把菜单改成以下数据……"
   - "基于顶部 Tab 导航，加5个 tab，第3个有下拉"
   - "用顶部菜单导航，第2个菜单项有三个子菜单"

2. 说明内容区的内容：
   - "内容区放一个列表页"
   - "内容区显示空状态"

3. Kiro 会复用现有导航组件的完整逻辑，只替换菜单数据和内容区。

### 导航模板不可随意修改的部分

- 顶部导航栏高度（56px）和固定定位
- 右侧4个图标（search / language / notification / user）的颜色规范
- 侧边栏宽度（232px / 64px）和过渡动画
- 菜单选中态颜色（`brand-color-light` + `brand-color`）
- Token 色值（所有颜色必须引用 CSS 变量）
