# OpenCode 迁移指南

本指南用于把当前 Codex 工作树交接给 OpenCode，并继续完成本轮多游戏、远征、回放和界面改造。

## 当前工作树状态

当前分支为 `main`，工作树有大量未提交修改和未跟踪文件。没有创建迁移提交，也没有清理或重置工作树。

迁移时必须保留：

- 远征抢商店、遗物、商店交易和节点进度相关修改。
- 局内契约、UNO 组队、飞行棋风暴航线、跳棋据点攻防、Graphwar 裂隙风暴。
- 回放 Worker 预取、房间侧栏、浮动字段、常玩游戏排序和开发态手机页。
- `tests/` 下新增的定向测试与 `public/art/` 下新增的 CC0 素材。

禁止使用以下方式接管工作树：

```sh
git reset --hard
git clean -fd
git checkout -- .
git stash
```

开始前先执行：

```sh
cd /Users/xiexie/Documents/ChatGPT/gamehullqinAI
git status --short --branch
git diff --check
```

## 安装与连接

macOS 任选一种官方安装方式：

```sh
curl -fsSL https://opencode.ai/v2/install | bash
```

```sh
brew install anomalyco/tap/opencode-v2
```

```sh
npm install -g @opencode/cli
```

确认安装：

```sh
opencode --version
```

在项目根目录启动：

```sh
cd /Users/xiexie/Documents/ChatGPT/gamehullqinAI
opencode
```

首次使用在 OpenCode TUI 中执行 `/connect`，按当前 provider 提示完成认证。认证信息不要写入仓库。

OpenCode 不会继承 Codex 的会话上下文。交接依赖当前 Git 工作树、`AGENTS.md` 和本指南。

## 项目规则读取

OpenCode 会自动读取项目根目录的 `AGENTS.md`。当前仓库没有 `Agents.custome.md`，因此不要把不存在的文件写入配置。

如需显式加载项目文档，可在项目根目录创建 `opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "docs/README.md",
    "docs/ui-design.md",
    "docs/multi-game-playability-plan.md",
    ".tmp/docs/visual-system-and-ui-refactor-plan.md",
  ],
}
```

可选的只读审查代理：

```md
---
description: 审查当前未提交变更，不编辑文件
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: ask
---

只做代码审查。按严重程度列出问题，给出文件、行号和回归风险，不修改文件。
```

文件位置：`.opencode/agents/reviewer.md`。实际模型和权限以当前 OpenCode 版本配置为准。

## 首轮提示词

建议先用 OpenCode 的 Plan 代理，不要直接进入 Build：

```text
你是本项目的接手开发。先只读分析，不要编辑文件。

请读取 AGENTS.md、docs/README.md、docs/ui-design.md、
docs/multi-game-playability-plan.md、
.tmp/docs/visual-system-and-ui-refactor-plan.md 和
.tmp/docs/visual-language-demo.html。

先执行 git status --short --branch 和 git diff --check。
概括当前未提交改动、已完成内容、未完成内容、架构分叉风险和
下一步最小可回滚变更。不要假设旧 agent 的会话内容仍然有效。

本项目禁止用浏览器、桌面或手机自动化执行界面测试。界面交互必须由
人类手动完成。开发中只运行相关定向测试，不运行全量测试。不要提交 Git，
等我完成 review 并明确允许后再 commit。
```

## 已完成的实现范围

### 远征

- 抢商店改为 24 回合限制，守卫生命与攻击提高。
- 胜利后本店免费并永久封死商店；失败后老板带走当前商品，后续商店保留。
- 新增金币蓄能遗物、随节点/战斗/打牌数升值的遗物、商店交易入口。
- 节点统计、回放字段、旧档迁移和相关定向测试已接入。

入口：

- [冒险推进](../src/domain/expedition/adventure.ts)
- [世界内容](../src/domain/expedition/world.ts)
- [冒险类型](../src/domain/expedition/adventure-types.ts)
- [商店界面](../src/client/expedition/CardNodes.tsx)
- [远征牌桌](../src/client/expedition/ExpeditionTable.tsx)

### 多游戏

- UNO 2v2／3v3、交替分队、队友手牌可见、团队胜负和队伍状态面板。
- 飞行棋风暴航线：天气、补给、能量、战术能力和特殊模式面板。
- 跳棋据点攻防：双人非对称目标、哨塔、回合上限和连跳奖励。
- Graphwar 裂隙风暴：动态风场、函数类别限制、场景选项和回放元数据。
- 全房公开契约，先完成者领取，AI 不抢占装饰性奖励。

核心入口：

- [契约](../src/domain/challenges.ts)
- [UNO](../src/domain/uno.ts)、[队伍面板](../src/client/uno/UnoTeamPanel.tsx)
- [飞行棋](../src/domain/flight.ts)、[特殊面板](../src/client/flight/FlightSpecialPanel.tsx)
- [跳棋](../src/domain/checkers.ts)、[特殊面板](../src/client/checkers/CheckersSpecialPanel.tsx)
- [Graphwar 规则](../src/domain/graphwar/rules.ts)

### 回放与界面

- 回放 Worker 在 Worker 内投影、按视角缓存并预取后续帧，主线程使用 `requestAnimationFrame` 时间轴。
- 房间菜单改为右侧侧栏，移动端为底部侧栏。
- 文本字段空值未聚焦时标签在框内，聚焦或有内容时上浮到输入框上方；玩法单选使用无描述、无图标的胶囊选项。
- 游戏目录按实际开局次数和最近开局时间排序。
- 按钮收敛为主操作、次操作和危险操作；顶栏与房间菜单共用中性样式，房间菜单只用间距分组。
- 进度条和滑块共享实心圆点、轨道和过渡样式。
- 新增开发态手机房间：`npm run dev` 打开 `http://127.0.0.1:1420/?dev=phone`，或 `npm run dev:phone` 打开 `http://127.0.0.1:1421/?dev=phone`；邀请链接会转到当前开发客户端并真实连接房间服务。
- 控件焦点缺口与字体角色、文本字段失焦摘要、界面字体／元素缩放、稳定的厅内切换、无黑底指令文字、远征行装抽屉、GraphWar MathLive 数学编辑与三页函数面板、图形化麻将课程与特殊模式课程、通用练习场与本地教学 AI、日本立直东风战跨局、牌桌元素级引导定位、飞行棋天气动画与移动预判、稀有成就陈列室、连接状态、折叠动画与间距规范已接入。
- 邀请链接会直接进入房间，不先经过大厅。

## 必须继续验证

当前已完成一轮构建和定向检查，但迁移后必须重新执行：

```sh
npm run build
npm test -- tests/uno-team.test.ts tests/flight-storm.test.ts tests/checkers-siege.test.ts tests/graphwar-storm.test.ts tests/challenges.test.ts tests/mode-replay.test.ts tests/room-input.test.tsx tests/mobile-room-toolbar.test.tsx tests/room-experience.test.tsx tests/visual-system.test.tsx tests/art-assets.test.ts tests/lobby-design.test.tsx tests/replay.test.ts
```

仍需人工验收：

1. 浏览器邀请链接和本地客户端粘贴链接是否直接进入正确房间。
2. 房间侧栏在桌面和手机的打开、关闭、焦点回收和焦点陷阱。
3. 按钮悬浮/按下是否只压暗，控件间距是否拥挤。
4. 浮动字段聚焦上浮是否顺滑，玩法单选卡片是否易操作。
5. 回放拖动、倍速、视角切换和连续播放是否平滑。
6. UNO 队友手牌、飞行棋风暴航线、跳棋据点攻防和 Graphwar 风场的真实交互。
7. 开发态手机房间的实际视觉、邀请链接联机、触控尺寸和安全区。
8. 远征抢商店胜利、超时、遗物估值和商店交易的完整流程。

不执行 Playwright、浏览器、桌面或手机自动化操作。界面交互由用户完成。

## 已知风险和待处理项

- 现有 Playwright 验证脚本中仍有直接查找房间工具栏按钮的旧路径；房间菜单改成侧栏后，相关脚本需要按新结构更新，或在用户手动验收时重新编写定位。
- 直接进入房间的自动连接行为已有代码路径，但还没有在真实服务、真实邀请链接和已占用身份场景下完成人工验收。
- 新游戏模式的 UI 大面板仍以状态展示为主，不能把静态组件测试当作真实触控验收。
- 当前工作树混有远征改造和本轮 UI/游戏改造，提交前必须拆分或完成一次整体 review，并保证每个独立变更可回滚。
- 正式构建已通过，但不代表 Windows、真实手机、音频、网络和动画帧率已经验收。

## 推荐接手顺序

1. 只读审查工作树并更新差异清单。
2. 重新跑构建和上述定向测试。
3. 先修回归问题，再补 UI 交互缺口。
4. 更新受房间侧栏影响的验证脚本或人工检查步骤。
5. 通过最终 review 后，按独立变更拆提交。
6. 用户完成界面验收后再进入发布流程。

## 会话交接原则

OpenCode 与 Codex 的会话历史不共享。后续上下文以以下文件为准：

- [项目约束](../AGENTS.md)
- [文档索引](README.md)
- [视觉样板](../.tmp/docs/visual-language-demo.html)
- [视觉与交互计划](../.tmp/docs/visual-system-and-ui-refactor-plan.md)
- 当前 `git diff` 和测试文件

不要依赖“上一轮 agent 说过什么”。以仓库实际内容为准。

## 官方依据

- [OpenCode Intro](https://opencode.ai/docs/)
- [OpenCode Config](https://opencode.ai/docs/config/)
- [OpenCode Rules / AGENTS.md](https://opencode.ai/docs/rules/)
- [OpenCode Agents](https://opencode.ai/docs/agents/)
