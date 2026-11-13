# 样式系统标准化计划

状态：阶段 0 与阶段 1 已实现；后续按阶段 2 起分批迁移。基础设施不重新设计界面，只收口 token、层级和护栏。

## 结论

不建议整体替换为 Astryx、StyleX、Tailwind 或 Panda CSS。当前项目已经有主题变量、控件封装、间距规范和大量游戏专属布局，整体换栈会带来高回归风险，收益主要来自工程规范而不是视觉框架。

建议借鉴 Astryx 的以下做法：

1. 主题是 CSS 自定义属性覆盖，不复制或分叉组件源码。
2. 使用语义 token，而不是在组件里直接写颜色和尺寸。
3. CSS 用 `@layer` 组织级联，组件样式与游戏样式有明确边界。
4. 间距按统一基数（4px/rem）派生，颜色按 `属性-角色` 命名。
5. 组件文档、token 文档和 CLI/agent 规则来自同一份索引。
6. 新控件优先组合成熟无头组件，视觉统一由 token 和 primitive 层负责。

推荐主线是：**原生 CSS + 现有主题变量 + CSS `@layer` + CSS Modules（新组件）+ Stylelint + 样式审计脚本 + 轻量样式陈列页**。Astryx 作为参考和后续试点，不进入当前依赖。

## 当前基线

基线由 `npm run style:audit` 生成到 `artifacts/style-audit/report.md`，脚本是唯一统计入口，文档不维护第二套数字。

主要文件：

- `src/styles.css`：全局控件、布局、上游隔离和跨模块规则集中在这里。
- `src/client/expedition/table.css`、`expedition.css`：远征牌桌与页面样式。
- `src/client/ui/native-shell-preview.css`：开发预览样式。
- `mobile-landscape.css`、`mobile-usability.css`、`mobile-home.css`、`mobile-table.css`、`phone-room.css`：移动端样式分散在多个入口。
- 移动端宽度、高度、方向和指针条件存在多套阈值。

已经具备的基础：

- [设计变量](../src/client/ui/design-tokens.css) 和 [主题注册](../src/client/themes.ts) 已存在。
- [间距规范](spacing.md) 已明确 4px 基数。
- [控件封装](../src/client/ui/Controls.tsx) 已统一部分 Button、Select、Switch、Slider、Dialog、Popover。
- [动效策略](../src/client/motion-policy.ts) 已区分界面、社交和游戏动画。
- 已有静态样式测试（如 [视觉控件测试](../tests/visual-system.test.tsx)）和人工审核流程。

初始审计问题（阶段 0/1 已处理基础设施部分）：

- 状态色、遮罩、阴影、层级和触控尺寸已补 token；断点仍分散，待阶段 3 收敛。
- 主题色值在 `themes.ts`，尺寸/动效在 `design-tokens.css`，已由 token 契约测试约束。
- 全局裸选择器、跨文件覆盖和 `!important` 仍存在，待阶段 2 分批迁移。
- 移动端规则按页面分散，同一个断点/安全区逻辑在多处重复，待阶段 3 处理。
- 游戏牌桌样式与通用控件混在全局层，新增游戏容易产生选择器冲突，待阶段 4 处理。
- 内联样式中有动态坐标/缩放的合理用法，也有可以提升为 CSS 变量的静态值。
- Stylelint、`@layer` 和审计脚本已加入；后续需要按文件 owner 持续迁移，而不是继续在全局样式追加覆盖。

## Astryx 评估

### 项目事实

- Meta 开源设计系统，MIT，当前标注 Beta。
- React 19+，内部使用 StyleX；消费者使用预构建 CSS，不要求采用 StyleX。
- 提供 150+ 组件、主题、暗色模式、页面模板和 CLI。
- 主题通过 CSS 自定义属性覆盖；官方 token 分为颜色、间距、尺寸、圆角、阴影、动效、边框、焦点等类别。
- 强调语义 token、组件可组合、可被 `className` 覆盖，以及“人和 AI 使用同一套文档与工具”。
- CLI 提供组件文档、token 文档、模板、主题构建、swizzle 和 codemod。

### 适合我们的部分

- **主题模型一致**：我们的 `themes.ts` 已经在输出 CSS 变量，Astryx 也把主题视为变量覆盖层，迁移理念一致。
- **token 命名和分层**：Astryx 用 `--color-text-*`、`--color-background-*`、状态色成对 token、4dp/rem 间距、语义 radius/motion token，这些可以直接借鉴。
- **级联分层**：`reset → base → theme → components` 的层次适合我们目前“全局样式 + 游戏样式 + 移动覆盖”的混合结构。
- **文档/CLI 思路**：生成组件和 token 索引，让 AI 不需要猜样式入口；这比引入具体组件库更能降低长期维护成本。
- **可替换性**：组件应可组合、可覆盖，不把视觉锁死在业务页面里。

### 不适合直接整体采用的部分

- 我们当前是 React 18，Astryx 要求 React 19；升级是独立工程，不应和样式标准化绑定。
- 我们的核心复杂度是 10+ 个游戏牌桌、H5 Canvas/SVG、上游游戏 DOM 和移动横屏布局，这些不适合 Astryx 的通用页面组件。
- Astryx 当前是 Beta；直接作为基础依赖会把项目节奏绑定到外部 API 变化。
- 我们的视觉身份是暖纸桌面和定制牌桌，直接使用 Astryx 默认组件会需要大量覆盖，反而增加一层。
- 现有 `Controls.tsx`、Radix primitives 和主题系统已经满足部分职责，整体替换不是长期最佳路径。

### 建议的 Astryx 使用方式

- 现在：只借鉴 token、层级、主题覆盖、组件文档和 agent 约定。
- React 19 升级完成后：可选做一次“设置页/表单页”试点，只在新页面或通用控件层试用 Astryx，不碰游戏牌桌。
- 试点通过的标准：主题可覆盖、移动端可用、包体可接受、构建不需要额外插件、视觉能保持现有暖纸风格。
- 游戏牌桌、手牌、地图、Canvas 和上游样式继续使用项目自己的 primitive/token 体系。

## React 19 升级评估

评估在项目副本中进行，不修改当前工作树：React、React DOM、类型定义和测试渲染器升级到 React 19（运行时 19.3.1），再执行类型检查、Vite 构建和完整 Vitest。

| 项目       | 结果                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型检查   | 19 处错误，分布在 10 个文件；集中在 `useRef` 必须显式初始值，以及 `RefObject<T \| null>` 与 `RefObject<T>` 不兼容                                                                                                                     |
| Vite 构建  | 通过，无插件或构建配置阻塞                                                                                                                                                                                                            |
| 主包体积   | React 19 主包 2,680 kB（gzip 809 kB），当前 React 18 为 2,599 kB（gzip 784 kB），约增加 82 kB（gzip 24 kB）                                                                                                                           |
| 完整测试   | 743 项中 728 项通过。15 项失败中，13 项是隔离副本缺少 `dist-server` 的 Worker/网络用例，2 项是当前未提交改动影响的界面断言（层级 token 位置与 `main.tsx` 结构）；另有 1 个既有 mock 用例在套件级失败，均可解释，未发现 React 渲染回归 |
| 运行时 API | 已使用 `createRoot`；未使用 `ReactDOM.render`、`findDOMNode` 或函数组件 `defaultProps`                                                                                                                                                |
| 测试工具   | `react-test-renderer` 在 19 仍可用但已废弃，长期应迁移到 `@testing-library/react`                                                                                                                                                     |

升级需要的最小改动：

- 给 `useRef` 补 `null` 初始值，并统一 `RefObject<HTMLElement | null>` 的接收类型。
- 将 `react-test-renderer` 测试逐步迁移到 `@testing-library/react`，可与升级分开进行。
- 升级后重新执行 `npx tsc --noEmit`、完整 Vitest、`npm run build`，并由用户人工审核桌面与手机界面。

结论：React 19 没有框架级阻塞，成本主要是类型收口和测试工具迁移。它与样式迁移解耦，建议在阶段 2 前单独完成一次升级提交，再决定是否做 Astryx 试点。当前不把 Astryx 加入依赖。

## 其他候选方案

| 方案                 | 作用                                            | 适合度 | 结论                                       |
| -------------------- | ----------------------------------------------- | ------ | ------------------------------------------ |
| Astryx               | 完整设计系统、token、主题和 CLI                 | 中     | 借鉴理念，React 19 后再试点                |
| Style Dictionary     | 从 W3C token 生成 CSS/JS/多端产物               | 中     | token 数量和团队协作需要时再引入           |
| CSS `@layer`         | 原生级联分层，零依赖                            | 高     | 首阶段采用                                 |
| CSS Modules          | Vite 原生支持，组件样式隔离                     | 高     | 新 primitive 默认采用                      |
| Stylelint            | 禁止裸色值、裸尺寸、非法断点和新增 `!important` | 高     | 首阶段采用                                 |
| Radix Themes         | 基于 Radix 的成品主题组件                       | 中     | 我们已有 Radix primitives，暂不整体替换    |
| Panda CSS            | 类型安全 token/recipes，零运行时                | 中低   | 全量重写成本高，暂不采用                   |
| Vanilla Extract      | 类型安全 CSS、主题和静态提取                    | 中低   | 适合新项目；当前 16k 行 CSS 迁移成本过高   |
| Tailwind CSS         | 原子类快速拼装                                  | 低     | 与现有定制牌桌和主题变量冲突大             |
| Storybook / 视觉回归 | 组件工作台、视觉基线                            | 中     | 可做轻量样式陈列页；当前不做自动化界面测试 |

推荐组合：

- **保留**：现有主题、CSS 变量、Radix primitives、暖纸视觉和游戏牌桌样式。
- **引入**：CSS `@layer`、CSS Modules、Stylelint、样式审计脚本、手动样式陈列页。
- **暂缓**：Style Dictionary、Panda CSS、Vanilla Extract、Tailwind、Astryx core。
- **后续评估**：React 19 后的 Astryx 设置页试点，以及 token 数量增长后的 Style Dictionary。

## 目标架构

### 1. Token 分层

保留两个现有真相源，不新建第二套值表：

- 颜色主题：`themes.ts` 的 `themeSchema` 和 `ThemeRegistry`。
- 尺寸、字体、间距、圆角、动效、断点、层级：`design-tokens.css`。

在此基础上补齐语义层：

- 颜色：`canvas/surface/raised/field/text/muted/accent` 之外，增加 `info/success/warning/danger` 基色；浅填充、边框和悬停由 `color-mix()` 从基色派生，不复制多套色值。
- 组件状态：`hover/pressed/selected/disabled/focus` 统一为语义角色。
- 结构：`overlay`、`shadow`、`skeleton`、`divider`、`track`。
- 尺寸：`control-height`、`touch-target`、`toolbar-height`、`safe-area`。
- 断点：只保留一组主断点和一组能力条件（`pointer: coarse`、`orientation`、`max-height`）。
- 层级：统一 `--layer-*`，禁止业务组件直接写 `z-index: 999`。

约束：

- 业务 CSS 不写新的十六进制色值；颜色只来自主题变量。
- 间距只从 `--space-*` 取值。
- 圆角、阴影、动效和断点只从 token 取值。
- 动态计算（地图坐标、缩放、进度条宽度）允许内联 CSS 变量或 style，但静态视觉值必须回到 token。

### 2. 级联分层

新增统一入口，概念顺序：

```css
@layer reset, tokens, base, primitives, app, games, mobile, utilities;
```

- `reset`：盒子模型、焦点、基础元素。
- `tokens`：`:root` 变量和主题模式。
- `base`：全局字体、可访问性、平台控件。
- `primitives`：Button、Field、Panel、Dialog、Drawer、Toolbar、Tabs、Badge、Skeleton。
- `app`：大厅、设置、聊天、更新等应用页面。
- `games`：各游戏牌桌，按 `[data-game]` 或模块作用域隔离。
- `mobile`：横竖屏、安全区、触控增强；只覆盖共享 primitive，不重复整个页面。
- `utilities`：极少量真正的通用工具类。

迁移时不把现有 16k 行 CSS 一次性包进 layer。先让新文件进入层级，再按页面/游戏分批迁移；每一批都由用户手动审核视觉，避免级联顺序变化造成不可见回归。

### 3. Primitive 层

把通用外观和交互从页面中抽出来，目标是“一个控件一种实现”：

- `Button`/`IconButton`：primary、secondary、danger、ghost；统一尺寸、焦点、禁用、加载。
- `Field`/`SearchField`/`TextArea`：标签、摘要、错误、帮助文本、搜索图标。
- `Panel`/`Dialog`/`Drawer`/`Popover`：遮罩、标题、关闭、移动端底部抽屉。
- `Toolbar`/`Tabs`/`SegmentedControl`：顶栏、房间工具栏、设置导航。
- `Select`/`Switch`/`Slider`：现有 Radix 包装统一 token。
- `Badge`/`StatusDot`/`EmptyState`/`Skeleton`：状态和加载反馈。

游戏牌桌继续使用自己的结构，但只能组合这些 primitive 和游戏专属布局类，不再复制一套按钮、面板、弹窗样式。

### 4. 响应式标准化

- 宽度断点收敛到 4 个主档位，数值以 [断点常量](../src/client/ui/breakpoints.ts) 为准；不再新增 300/560/640/650/720/920 等零散阈值。
- 方向、高度和指针能力作为独立条件：`pointer: coarse`、`orientation: landscape`、`max-height`。
- 手机端统一触控目标（至少 44px）、安全区、`100dvh`、软键盘和横向滚动策略。
- 能按组件宽度判断的布局使用 container query，不再全部依赖窗口宽度。
- 移动端样式按“共享 primitive 增强 + 游戏专属增强”拆分，避免一个文件覆盖所有游戏。

### 5. 样式文档与 AI 约束

- `docs/ui-design.md` 继续作为入口，但只保留索引和规则。
- 新增 token 表、组件清单和样式边界说明；信息只出现一次，代码路径作为索引。
- 增加 `npm run style:audit`：静态扫描裸色值、裸像素、断点、`!important`、重复选择器和文件行数，输出报告但不直接改代码。
- 增加 Stylelint：新代码禁止裸颜色、裸间距、非法断点和新增 `!important`；历史文件先以报告/白名单方式迁移。
- 新文件放在明确的 owner 目录：`ui/primitives`、`app/...`、`games/<name>`、`mobile/...`。
- 组件和 token 文档可由脚本生成索引，让后续 AI 修改先读规范，而不是在 `styles.css` 里继续追加覆盖。
- 提供 `?dev=styles` 轻量样式陈列页，集中展示桌面/手机、浅色/深色、默认/悬停/禁用/加载状态；由用户手动查看，不执行自动化界面测试。

## 实现入口

| 职责            | 单一入口                                                             |
| --------------- | -------------------------------------------------------------------- |
| 颜色主题 token  | [主题注册与浅深主题](../src/client/themes.ts)                        |
| 结构/层级 token | [设计变量](../src/client/ui/design-tokens.css)                       |
| 级联顺序        | [层级定义](../src/client/ui/layers.css)                              |
| 级联顺序契约    | [契约测试](../tests/style-cascade-order.test.ts)                     |
| 层级契约        | [契约测试](../tests/style-layer-contract.test.ts)                     |
| 断点常量        | [断点](../src/client/ui/breakpoints.ts)                              |
| 新样式护栏      | [Stylelint 配置](../stylelint.config.mjs)、[违规基线门禁](../scripts/style-lint-gate.mjs)、`npm run style:lint` |
| 违规基线        | [基线](../scripts/style-lint.baseline.json)                           |
| 样式审计        | [审计脚本](../scripts/style-audit.mjs)、`npm run style:audit`（只报告，不设门禁） |
| 文档完整性      | [文档检查](../scripts/doc-check.mjs)、`npm run doc:check`            |
| 样式陈列页      | [陈列页](../src/client/dev/StyleGallery.tsx)、开发路由 `?dev=styles` |
| token/层级契约  | [样式系统测试](../tests/style-system.test.tsx)                       |

## 层级契约

层级 token 的唯一来源是[设计变量](../src/client/ui/design-tokens.css)，顺序由低到高固定为 chat < effects < practice < party < dialog-overlay < drawer < celebration < dialog < popover < notice；桌面与手机共享同一顺序。新增浮层只允许复用 token，不写裸 z-index；共享浮层与实际层级的对应关系由[层级契约测试](../tests/style-layer-contract.test.ts)锁定。

## 陈列页人工审核

入口：`npm run dev` 后打开 `http://127.0.0.1:1420/?dev=styles`。由用户手动检查，不使用浏览器或桌面自动化。

- 陈列页根节点保留 `app-shell` 作用域；按钮、搜索框、字段和状态控件才会获得与应用内相同的 primitive 样式。
- 浅色、深色、跟随系统三种模式切换后，画布、面板、文字、边框和状态色无异常。
- 桌面与手机两组面板的按钮、搜索框、下拉、开关、滑杆尺寸一致，没有横向溢出。
- 主操作、普通、危险、禁用按钮的状态可区分；信息、成功、警告、错误四种状态色在浅深色下都可读。
- 骨架屏和空状态不跳动；窄窗口下双栏折叠为单栏。
- 页面只消费 token 和 CSS Modules，不引入新的全局选择器。

## 分阶段落地

### 阶段 0：基线与护栏（已完成，不改视觉）

- 建立样式审计脚本和基线报告。
- Stylelint 覆盖 `src/**/*.css`；规则全部启用，按“文件 × 规则”的违规计数与[基线](../scripts/style-lint.baseline.json)比对：新增文件或单文件计数上升即失败，下降后手动收窄基线。
- 样式审计继续生成报告与声明级数据，作为迁移与人工评审输入，不单独设门禁。
- 建立 token 命名、断点、层级、文件 owner 规则。
- 建立轻量样式陈列页和人工审核清单。
- 验收：现有页面视觉无变化；审计能列出当前问题；新增文件有明确规则。

### 阶段 1：Token 与主题收口（已完成，不改视觉）

- 补齐状态色、遮罩、阴影、触控、层级和断点 token。
- 扩展 `themeSchema` 的颜色语义；主题只允许覆盖 token，不允许在组件里写主题特例。
- 建立 token 契约测试，防止 `themes.ts`、CSS 变量和文档漂移。
- 验收：浅色/深色/系统主题仍一致；未出现第二套 token 值表。

### 阶段 2：通用 primitive 与级联分层（重点）

- 先锁定“基础层 → 模块层”的加载顺序不变式并加测试；当前模块 CSS 可能先于 `src/styles.css` 注入，直接包 layer 会反转优先级。
- 按钮已收口为 `data-button-variant` 单一入口（[控件](../src/client/ui/Controls.tsx)）；`.primary-button` 只作为原站与旧调用点的别名，与主按钮共享同一套 token 声明。
- 新控件使用 CSS Modules 或明确的 `data-ui` 作用域。
- 先迁移设置、聊天、大厅、弹窗、更新页等应用层；游戏牌桌暂不重写。
- 逐批把全局 `styles.css` 中的通用选择器移入 `primitives`/`app` layer。
- 清理有代表性的 `!important`，只保留减少动态、第三方和必要的可访问性场景。
- 验收：同类控件只有一个入口；桌面和手机视觉通过人工审核；没有新增 specificity 补丁。

### 阶段 3：移动端标准化

- 合并移动端断点、触控、安全区和横屏规则。
- 先把共享 primitive 迁移到统一 mobile layer，再迁移各游戏专属覆盖。
- 使用 container query/页面布局数据替代重复的窗口宽度判断。
- 验收：手机竖屏、横屏、软键盘、触控、低高度窗口全部人工复核。

### 阶段 4：游戏样式边界

- 每个游戏拥有独立样式入口，统一以 `[data-game="..."]` 或 scoped class 限定。
- 抽出牌桌共享 primitive：手牌槽、卡牌容器、状态条、玩家头像、操作栏、结算层。
- 上游游戏 CSS 继续隔离，不重写原站资源；只在外层做尺寸和主题适配。
- 验收：新增游戏不修改全局 `styles.css`；切换游戏无样式残留。

### 阶段 5：Astryx 试点（可选，前置 React 19）

- 选设置页或一个独立表单页做试点，不碰牌桌。
- 比较 Astryx 与现有 Controls 的包体、主题覆盖、移动端和无障碍表现。
- 只有在视觉、性能和维护成本都优于现有 primitive 时才扩大使用。
- 不通过则保留 Astryx 作为参考，不进入依赖。

## 成功指标

- 新增业务 CSS 中十六进制颜色为 0（主题和上游资源除外）。
- 新增静态间距的裸 `px` 为 0；动态计算除外。
- 新增 `!important` 为 0；历史 `!important` 只保留在减少动态、第三方和选择策略白名单。
- 只使用批准的 4 个左右主断点及能力条件。
- 新增 Button、SearchField、Panel、Dialog、Drawer、Toolbar 只能复用 primitive。
- 同类组件不再出现多套全局选择器和跨页面覆盖。
- 样式审计、Stylelint、类型检查和现有测试通过。
- 桌面与手机样式陈列页由用户手动审核通过。
- CSS 行数不是唯一目标；更重要的是样式 owner 清晰、覆盖路径可预测、AI 不需要猜入口。

## 非目标

- 不在本阶段做视觉换肤或重新设计。
- 不整体迁移到 Tailwind、Panda CSS、Vanilla Extract 或 StyleX。
- 不改游戏规则、Canvas 渲染、上游资源或联机协议。
- 不用自动化浏览器/桌面操作替代用户界面审核。
- 不为了减少 CSS 行数强行合并职责不同的规则。

## 风险与控制

| 风险                            | 控制                                             |
| ------------------------------- | ------------------------------------------------ |
| `@layer` 改变级联导致隐藏回归   | 分批迁移，每次只动一个页面/游戏，用户人工复核    |
| Primitive 抽取改变现有视觉      | 先等价迁移，再清理重复；陈列页对齐桌面/手机状态  |
| 主题 token 扩展导致浅深色不一致 | 契约测试 + 浅深色人工审核；主题只覆盖变量        |
| 移动端断点合并改变横屏布局      | 先审计现有条件，保留 orientation/height 能力条件 |
| React 19 升级与样式迁移互相阻塞 | Astryx 试点放到 React 19 后，独立验收            |
| AI 继续在全局样式追加补丁       | Stylelint + 文件 owner + 审计脚本 + 文档索引     |

## 已确认决策

1. 先完成阶段 0 + 阶段 1 的无视觉基础设施，再挑页面做完整样板。
2. 新 primitive 使用 CSS Modules。
3. 已完成一次 React 19 升级评估，见下节；升级是否执行由评估结果决定，不与样式迁移绑定。
4. 样式陈列页使用开发路由 `?dev=styles`。
