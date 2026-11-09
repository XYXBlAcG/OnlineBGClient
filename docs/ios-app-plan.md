# iOS 客户端：加入、语音与移动大厅

状态：M0 基础已落地，未签名 IPA 已随 `v0.4.1` 发布；等待 iOS 27 真机语音、相机与触屏验证。已确认：语音优先采用原生 Swift LiveKit + Web 桥；只支持 iPhone；通过 GitHub Actions 生成 IPA 自行安装；本地开局为第一版必达。手机浏览器继续作为免安装入口，边界见 [手机浏览器](mobile-browser-plan.md)；桌面语音见 [客户端房间语音](client-voice.md)。

当前 M0 已有：平台能力层、Tauri iOS 工程与权限、原生 Swift LiveKit 桥、二维码扫描入口、GitHub IPA 工作流、移动首页、本地开局与移动大厅。宿主机仍需 Xcode/iOS SDK；真机语音、相机和触屏验收待用户执行。

第一版目标：让手机更容易加入朋友的房间，并在 iOS 客户端提供浏览器没有的连麦、移动大厅、本地开局和完整移动牌桌。手机独立开房放到后续阶段，不依赖浏览器承担房间服务。

开发与验收基线：iOS 27、iPhone 18 Pro。最低部署版本先定 iOS 17.0；如果原生 LiveKit、音频会话或 Tauri iOS 要求更高，在 M0 记录后调整。只支持 iPhone，不做 iPad 专属布局。

## 范围

| 能力 | iOS 第一版 | 手机浏览器 | 桌面客户端 |
| --- | --- | --- | --- |
| 加入房间、邀请链接、二维码 | 支持 | 支持 | 支持 |
| 最近房间、自动恢复身份 | 支持 | 恢复身份；最近房间后续 | 支持 |
| 移动首页与移动大厅 | 支持 | 仅加入页 | 桌面大厅 |
| 单人／本地 AI 对局 | 支持 | 不新增 | 支持 |
| 房间语音 | 支持，基础连麦 | 不支持 | 支持 |
| 语音变声 | 第一版不支持 | 不支持 | 支持 |
| 房主语音服务配置 | 不支持 | 不支持 | 支持 |
| 创建公网房间 | 后续 | 不支持 | 支持 |
| 桌面辅助窗口、自动更新、托盘 | 不支持 | 不支持 | 支持 |
| PWA／云端部署 | 第一版不做 | 第一版不做 | 不适用 |

第一版不做：手机开房、Android、iPad 专属布局、跨应用全局按键、语音录音／转写／视频、语音变声、App 内自动更新、云端账号。

## 产品流程

### 首次启动

1. 进入移动首页，不要求账号。
2. 主操作是「加入房间」，次操作是「本地开局」；没有邀请链接时说明需要朋友在电脑开房。
3. 昵称、头像、主题保存在本机，后续加入不再重复填写。

### 加入房间

1. 从聊天软件打开邀请链接，进入手机浏览器或 iOS 客户端。
2. iOS 客户端支持粘贴完整邀请链接、扫描房主二维码、从剪贴板识别链接。
3. 显示房间游戏、人数和身份恢复状态，确认后加入。
4. 同一设备保存房间身份；重新打开应用可继续原席位。

第一版不承诺通用链接唤起：房主公网地址每次创建都会变化，无法为临时隧道域名配置 Universal Links。二维码和粘贴链接是稳定入口，固定客户端域名后再接入深链接。

### 本地开局

1. 移动大厅选择游戏，默认 1 名真人并用 AI 补足到最低人数。
2. 一键开始，不依赖电脑、不连接房间服务。
3. 本地对局可保存和继续；AI 默认普通难度、单线程或受限线程，困难 AI 明确提示耗电和耗时。
4. 练习场继续复用现有教学入口，不复制游戏规则。

### 房间内

1. 等待室：准备、开始、邀请、房间菜单、语音入口。
2. 对局：沿用现有手机牌桌与沉浸模式，进入后减少顶栏和说明文字。
3. 聊天：底部抽屉、图片、常用语、未读和语音栏。
4. 离开／恢复：保留房间身份，处理锁屏、切后台和网络切换。

## 平台架构

采用 **同一套 React 客户端 + Tauri 2 iOS 壳**。不新建第二套手机牌桌，不把桌面 Rust 模块直接搬进 iOS。

### 平台能力单一来源

新增客户端平台能力层，启动时解析一次，界面只读取能力，不再各自判断 `isTauri()`。

| 能力 | 桌面 | iOS | 浏览器 |
| --- | --- | --- | --- |
| 移动界面 | 否 | 是 | 触屏设备 |
| 本地对局 | 是 | 是 | 后续可选 |
| 房间语音 | 是 | 是 | 否 |
| 房主语音配置 | 是 | 否 | 否 |
| 创建公网房间 | 是 | 后续 | 否 |
| 原生辅助窗口 | 是 | 否 | 否 |
| 应用内更新 | 是 | GitHub IPA 重装 | 否 |
| 二维码扫描 | 否 | 是 | 系统相机 |
| 安全区、触屏手势 | 部分 | 是 | 是 |

平台能力层负责这些分支：

- `mobile`：iOS 和触屏浏览器使用移动界面。
- `voice`：桌面与 iOS 可用，浏览器不加载语音模块。
- `hosting`：只有桌面可以创建公网房间。
- `voiceHostConfig`：只有桌面房主可以填写 LiveKit 配置。
- `auxiliaryWindows`：只有桌面可以打开设置、聊天、邀请等原生辅助窗口。
- `updater`：只有桌面显示软件更新；iOS 通过 GitHub IPA 重新安装更新。
- `nativeFiles`、`notifications`、`externalLinks`：按平台能力决定是否显示。

### 需要移除的桌面假设

当前多处 `isTauri()` 实际只对桌面成立，iOS 上会误开桌面能力：

- [移动判断](../src/client/use-mobile.ts)：`!isTauri()` 会让 iOS 落入桌面布局。
- [原生窗口](../src/client/native/windows.ts)：`nativeMain()` 会在 iOS 尝试打开辅助窗口。
- [设置](../src/client/Settings.tsx)：`desktop = isTauri()` 会把软件更新、快捷键、语音房主配置显示给 iOS。
- [应用入口](../src/main.tsx)：`nativeMain()`、`!mobile` 同时承担布局、窗口和平台判断。
- [更新](../src/client/updates/UpdaterController.tsx)、[字体](../src/client/fonts.tsx)、[表情](../src/client/emoji/client.ts)、[缓存](../src/client/CacheSettings.tsx)、[文件](../src/client/files.ts)、[外部链接](../src/client/ExternalLink.tsx)：需要按平台能力降级，不能调用 iOS 不存在的桌面命令。

这些问题先统一修，不把条件判断继续散落到页面里。

### Tauri iOS 壳

- 使用 Tauri 2 iOS 入口，保留现有 React 构建产物。
- 主窗口配置保持 `create: false` 供桌面自定义创建；iOS 在 `mobile::setup` 中从同一配置创建主窗口，不能依赖自动创建。
- 桌面模块继续 `cfg(not(mobile))`；Rust 依赖改为按目标平台引入，避免 `keyring`、托盘、窗口状态、更新器等桌面依赖进入 iOS 构建。
- 新增移动语音桥：麦克风权限、`AVAudioSession` 分类与路由、系统中断、输出切换、通话期间保持屏幕唤醒。
- 新增二维码扫描、剪贴板读取、触感反馈、分享等移动能力，优先使用官方 Tauri 插件。
- 第一版注册自定义 scheme 作为后续深链接预留，不承诺临时 HTTPS 邀请链接直接唤起 App。
- 最低系统版本 iOS 17.0；开发与验收基线为 iOS 27、iPhone 18 Pro。

### SwiftUI 外壳原型

第一版原生外壳原型位于 [ios-native](../ios-native/)，独立于 Tauri 工程。它用 SwiftUI 渲染首页、大厅、加入、设置和手牌托盘，牌桌仍由 Web 引擎承担。生成与启动见 `npm run native:preview`；界面审核规则见 [界面评审](ui-review-workflow.md)。原型通过前不替换现有 Tauri 外壳，也不触发 iOS Release。

原型阶段使用静态 Swift 游戏目录和手牌数据；正式接入时由 TypeScript 目录生成 JSON 和图标资源，避免长期维护两套数据源。

### 构建与分发

- 生成并维护 `src-tauri/gen/apple`，不把桌面窗口配置当成 iOS 配置。
- 独立 iOS bundle id、应用图标、启动图、麦克风与相机权限说明。iOS 图标由 `npm run icons:ios` 从 [应用图标](../public/icon.svg) 生成并同步到 `src-tauri/icons/ios` 与 Xcode asset catalog。
- 新增 iOS 构建入口与 CI：macOS runner 生成 arm64 IPA，上传 GitHub Actions artifact；正式版本由统一发布工作流附加到对应 `vX.Y.Z` Release。
- 第一版不做 TestFlight 和 App Store；GitHub 产物为 IPA，由用户自行签名安装。
- 未签名 IPA 不能直接被 iOS 安装，需要 Sideloadly、AltStore 或自有 Apple Developer 证书签名；免费 Apple ID 签名通常 7 天到期，更新需重新安装。
- 未签名构建使用 Release、arm64，关闭代码签名后打包 `Payload/OnlineBGClient.app`；签名由用户侧完成。
- 本地构建需要 Xcode 和 iOS SDK，入口为 `npm run ios:build`；CI 入口见 [iOS 工作流](../.github/workflows/ios.yml)，正式发布由 [统一发布工作流](../.github/workflows/desktop.yml) 调用。
- 如果后续提供签名安装，CI 通过 secrets 接收证书和 Provisioning Profile 生成 ad-hoc IPA；没有 secrets 时仍输出未签名 IPA，不阻塞构建。
- 桌面与 iOS 共用应用版本号和发布流程，协议版本独立管理。
- IPA 更新通过重新安装完成，对局中不强制升级。

## 移动界面

### 首页

```text
手机首页
├─ 快速开始：上次玩的游戏 / 和 AI 玩
├─ 加入房间：粘贴链接 / 扫码 / 最近房间
├─ 和朋友玩：邀请说明 / 需要电脑开房时明确说明
└─ 设置
```

- 主操作是加入房间，不要把主题、头像、动效等低频设置放在首屏。
- 最近房间直接显示游戏名、人数和恢复身份。
- 没有电脑房主时，明确说明“请朋友在电脑客户端开房”，不显示不可用的创建按钮。

### 移动大厅

- 复用 [游戏目录](../src/domain/catalogue.ts)，不复制游戏列表。
- 两列游戏卡片、分类、搜索、常玩和收藏。
- 选游戏后在底部抽屉配置真人和 AI；开始按钮固定在安全区内。
- 本地对局和联机加入使用同一套大厅视觉，不出现桌面侧栏。
- 创建公网房间在后续版本接入，第一版不放置无效入口。

### 房间与牌桌

- 复用现有 [房间工具栏](../src/client/RoomToolbar.tsx)、[手机横屏布局](../src/client/ui/mobile-landscape.css) 和 [手机可用性样式](../src/client/ui/mobile-usability.css)。
- 顶部只保留房间名、人数、连接状态和语音状态；主要操作固定在底部拇指区。
- 手牌横向滚动、选中态、二次确认、地图缩放和拖动沿用现有实现。
- 长按、悬停信息在触屏上必须有可点击入口，不依赖 hover。
- 手机对局中禁止页面级下拉刷新和横向滚动，避免误触重载。
- 横屏优先用于三国杀、卡坦岛、璀璨宝石、领土；首次进入给一次性提示，不强制锁定。
- 第一版逐款真机验收 12 款游戏，不以浏览器尺寸模拟代替。

### 语音界面

- 房间工具栏显示语音入口和当前状态；聊天抽屉底部保留紧凑语音栏。
- 底部提供大尺寸麦克风按钮，支持自由说话和按住说话；按住说话使用触摸事件，不依赖键盘。
- 默认静音加入，主动开麦才请求系统麦克风权限；拒绝权限时说明系统设置入口，不影响游戏。
- 成员列表显示说话状态、静音、禁言、移出和允许加入；房主权限沿用现有语音模型。
- 输出路由优先跟随系统；iOS 默认使用扬声器或听筒由原生音频会话决定，并提供蓝牙设备切换说明。
- 第一版目标覆盖锁屏与后台通话；M0 必须验证系统中断、后台音频和恢复，不能用界面假状态掩盖媒体中断。

### 设置

移动设置至少包含：

- 外观：主题、界面字体、牌桌元素大小、动效。
- 声音与语音：麦克风、说话方式、音量、游戏音效压低；房主 LiveKit 配置仅桌面显示。
- 消息与互动：横幅、表情、图片清晰度。
- 数据：本地对局、聊天图片缓存、清理。
- 关于：版本、隐私、开源许可。
- 快捷键：仅桌面显示；iPhone 第一版不提供快捷键编辑。

### 通用交互

- 触控目标不小于 44pt，正文不小于 12pt。
- 安全区、刘海、横竖屏和软键盘统一由现有视口入口处理。
- 聊天输入聚焦时发送按钮不被键盘遮挡。
- 选择、发送、确认、断线分别有明确状态；不使用假出牌动画。
- 动效遵循系统减少动态效果设置；低电量或低端设备默认降低特效。

## 语音技术

### 复用边界

- 采用 **原生 Swift LiveKit + Web 桥**（路线 B 已确认）。
- Web 层保留 [语音会话](../src/client/voice/session.ts)、[语音协议](../src/domain/voice.ts) 和语音界面；iOS 只替换媒体传输层。
- 新增 `NativeVoiceTransport` 实现 [VoiceTransport](../src/client/voice/session.ts) 接口，通过 Tauri 命令和事件驱动原生媒体层。
- 桌面继续使用 [LiveKit 适配](../src/client/voice/livekit.ts)；浏览器不加载语音模块，不请求麦克风权限。
- 加入者不需要配置 LiveKit；房主继续在桌面客户端配置。
- 语音属于房间，不属于游戏；切换游戏、结束对局不退出语音。
- 第一版不做变声；iOS 隐藏变声入口，桌面保留现有能力。

不采用路线 A 作为主路线：WKWebView 的麦克风授权、音频会话和后台行为不确定性高，失败后容易在 WebView 上堆补丁。不采用路线 C：会形成第二套语音界面。

### iOS 接入

- 语音令牌请求复用房间服务的 `/voice`，不新增云端账号或公共令牌服务。
- Web 层负责获取短期令牌并调用 `NativeVoiceTransport`；原生层不读取 LiveKit API Secret。
- 原生层使用 LiveKit Swift SDK、`AVAudioSession`、麦克风权限、输出路由、系统中断和后台音频；目标覆盖锁屏与切后台通话。
- LiveKit Swift 作为 Xcode 工程依赖在 app target 中编译，由 Xcode 处理 WebRTC 动态框架链接与嵌入；Rust 插件只持有原生插件句柄。
- Web 层继续负责 `VoiceSession` 状态机、成员列表、静音、耳机静音、个人音量、房主禁言和移出。
- 麦克风输入测试和设备枚举改为可注入探针；iOS 使用原生探针，不复用 Web 的 `MicrophoneProbe`，输出路由由原生层处理。
- 原生事件通过 Tauri 事件回传：成员说话状态、连接阶段、播放阻塞、权限变化、设备丢失和处理错误。
- `Info.plist` 增加 `NSMicrophoneUsageDescription` 与后台音频模式；音频会话使用 `.playAndRecord` / `.voiceChat`，默认扬声器或听筒路由由原生层决定。
- 移动语音设置只显示设备、说话方式和音量，不读取桌面 `voice_config`，不显示房主 LiveKit 配置。
- 第一版 iOS 只作为加入者；房主配置界面仅桌面显示。
- 如果后续 iOS 开房，再单独设计 Keychain 凭据和房间宿主，不复用桌面文件路径。

### 技术验证

M0 只验证路线 B，不再比较 A／C：

- LiveKit Swift SDK 在 iOS 27、iPhone 18 Pro 上连接、采集、播放和重连。
- Web 桥的命令、事件和 `VoiceSession` 状态是否一致。
- 麦克风权限、扬声器／听筒／有线耳机／蓝牙切换。
- 来电、闹钟、耳机拔出和音频中断后的恢复。
- 锁屏、切后台、Wi-Fi 与移动数据切换后的通话状态。
- 两台 iPhone + 一台桌面客户端稳定通话 30 分钟，无持续回声和明显断音。
- 后台音频、屏幕唤醒和长时间通话的耗电。

如果原生路线仍无法满足通话稳定性，不在 WebView 上继续打补丁；先停下重新评审媒体方案。

## 邀请与身份

- 房主继续使用现有 [邀请组件](../src/client/Invite.tsx) 生成链接和二维码。
- iOS 第一版支持粘贴链接、扫码和最近房间；二维码内容仍是现有邀请链接。
- 加入前展示房间游戏和人数，不自动执行不可信链接。
- 同一设备保存房间身份；重新安装或清理数据后需要重新加入。
- 固定客户端域名后再接入 Universal Links、自定义 scheme 和分享扩展，不把临时隧道地址写进 App 配置。
- iOS 本地存档和身份可能随应用卸载清除；关键回放和存档后续提供导出，不把本机存储当唯一备份。

## 工作分解

### M0：技术验证

- Tauri iOS 在 iPhone 18 Pro、iOS 27 上启动现有客户端。
- 验证 WKWebView 的 Worker、IndexedDB、WebSocket、安全区和横竖屏。
- 验证 LiveKit Swift SDK、`NativeVoiceTransport` 与 Web 状态桥。
- 验证二维码扫描、剪贴板、麦克风权限、音频路由和后台音频。

产出：可运行的 iOS 壳 + 原生语音验证报告；不进入完整界面开发。

### M1：平台基础

- 新增平台能力层，替换 `useMobile`、`nativeMain`、`isTauri` 的桌面假设。
- 桌面辅助窗口、更新、字体、表情、缓存、文件、外部链接按能力降级。
- iOS 工程、图标、权限和 CI 跑通，生成未签名 arm64 IPA。
- 手机首页骨架与移动设置入口。

验收：iOS 启动进入移动界面；桌面行为无回归；浏览器不加载原生模块；GitHub 能下载 IPA。

### M2：加入房间

- 手机首页、加入页、最近房间、自动恢复。
- 粘贴链接、扫码、剪贴板识别。
- 房间信息预览、错误状态、协议版本提示。
- 手机浏览器保持现有加入页，不要求安装。

验收：已保存身份时从链接或最近房间一键进入；首次加入只需昵称和确认。

### M3：移动大厅与本地开局

- 移动大厅、游戏选择、AI 配置、本地开局和保存。
- 本地 AI 线程与电量策略。
- 练习场入口复用。
- 12 款游戏手机牌桌逐款验收。

验收：不连接电脑也能完成一局本地对局；退出重进可继续。

### M4：房间语音

- `NativeVoiceTransport`、原生 LiveKit Swift、iOS 语音令牌、音频会话和麦克风权限。
- 移动语音栏、按住说话、成员列表、房主管理。
- 来电、耳机、蓝牙、网络切换和前后台恢复。
- 与桌面客户端、另一台 iPhone 的真实通话验收；第一版不做变声。

验收：默认静音加入；开麦后双向可听；静音、耳机静音、禁言和移出生效；锁屏和切后台行为明确；不通话不影响出牌。

### M5：打包与侧载

- 全游戏真机回归、iPhone 18 Pro 性能、内存和耗电。
- GitHub Actions 生成 arm64 IPA，上传 artifact 和 Release。
- 验证未签名 IPA 的侧载安装、权限弹窗、重装和签名有效期。
- 版本与协议兼容检查、重装更新提示。
- 发布统一的 GitHub Release（桌面与 iOS）；不做 TestFlight 和 App Store。

### M6：后续

- 手机开房：远程宿主或云端房间服务，按 [手机远程开房](remote-host-plan.md) 单独评审。
- 固定客户端域名、Universal Links、PWA 或 Android。
- 手机房主语音配置与本地凭据。

## TDD 与验收

### 自动检查

- 平台能力：桌面、iOS、浏览器三种组合的布局、语音、更新和房主配置开关。
- 移动首页与加入：链接、二维码、最近房间、身份恢复、错误提示。
- 本地开局：本地连接、AI 补位、保存和继续。
- 语音原生桥：命令、事件、令牌、静音加入、权限拒绝、断线恢复与 `VoiceSession` 状态一致。
- 设置可见性：iOS 不出现桌面更新、辅助窗口和房主语音配置。
- 邀请解析：完整链接、二维码内容、无效链接和协议不匹配。
- iOS 打包：未签名 IPA 结构、arm64、权限说明和 Release 资产。

### 真机手动验收

以下由用户亲自执行，不以浏览器模拟或静态测试代替：

1. 全新安装，首次启动，加入房间，保存身份，杀掉应用后重新打开并恢复。
2. 粘贴链接、扫描二维码、从剪贴板识别；无效链接和房间关闭有明确提示。
3. 本地开局，选游戏，AI 补位，完成一局，退出继续。
4. 两台 iPhone 与桌面客户端加入语音：默认静音、开麦、静音、耳机静音、个人音量、房主禁言、移出和重新允许。
5. 扬声器、听筒、有线耳机、蓝牙耳机切换；来电和闹钟中断后恢复。
6. 锁屏、切后台、Wi-Fi 与移动数据切换、房间服务重启后的恢复行为。
7. 12 款游戏逐一检查手牌、地图、建造点、弹层、聊天、横竖屏和安全区。
8. iPhone 18 Pro 低电量模式、长局内存、耗电和后台音频。
9. 从 GitHub Release 下载 IPA，自行签名安装，验证权限弹窗、重装和签名有效期；不依赖 TestFlight 或 App Store。
10. iOS 27 系统权限、后台音频、锁屏恢复和网络切换。

### 发布门槛

- 原生语音路线在 M0 通过，不带着未验证的媒体方案进入完整开发。
- 桌面 Windows／macOS 回归通过，手机浏览器加入流程不回归。
- iOS 真机全游戏覆盖，不只验证加入页。
- GitHub IPA 可侧载安装，重装后身份恢复行为明确。
- 协议版本不一致时明确提示，不静默失败。

## 风险与待定

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| 原生 LiveKit 与 Web 状态不同步 | 成员、静音或连接状态不一致 | 单一 `VoiceSession` 状态源；`NativeVoiceTransport` 契约测试与真机回归 |
| LiveKit WebRTC 动态框架 | 静态插件链接后运行时缺少 framework | 已改为 Xcode app target 本地 Swift Package，IPA 内含 `LiveKitWebRTC.framework`；真机启动待验 |
| iOS 后台音频被系统中断 | 锁屏或切后台通话中断 | M0 实测 `AVAudioSession`、后台模式和中断恢复；失败时明确边界，不伪造状态 |
| 原生 LiveKit / Tauri iOS 版本兼容 | 编译或运行失败 | M0 锁定版本并记录最低 iOS；不把桌面依赖带进 iOS |
| `isTauri` 桌面假设分散 | iOS 误开辅助窗口、更新、文件命令 | M1 平台能力层统一修复，逐项测试 |
| 桌面依赖进入 iOS 构建 | 编译失败或包体过大 | Cargo 目标依赖拆分，桌面模块保持 `cfg(not(mobile))` |
| 临时邀请域名无法 Universal Link | 链接不能直接唤起 App | 第一版扫码／粘贴；固定域名后再做深链接 |
| iOS 存储被系统清理或重装清空 | 本地存档和身份丢失 | 关键记录可导出；身份可重新加入 |
| IPA 侧载签名过期 | 应用无法启动或需重装 | 文档说明免费证书期限；可选配置签名 secrets 生成 ad-hoc IPA |
| 首包与 AI 计算 | 设备启动慢、发热 | 不做 PWA 缓存；按需加载、限制线程、低电量降级 |
| 协议版本不一致 | 新 App 连旧房主失败 | 明确更新提示；服务端保持兼容窗口 |

实施默认：

- 语音采用原生 Swift LiveKit + `NativeVoiceTransport`；第一版只做基础连麦，不做变声。
- 只支持 iPhone；主验收 iPhone 18 Pro、iOS 27；最低部署 iOS 17.0，M0 按实际依赖调整。
- 本地开局与加入房间同为第一版必达。
- GitHub Actions 输出未签名 arm64 IPA；由用户自行签名安装。需要直接安装时，再在 GitHub secrets 配置证书和 Provisioning Profile 生成 ad-hoc IPA。
- 不做 TestFlight、App Store、手机开房、PWA 和云端部署。

## 实现入口

| 职责 | 计划入口 |
| --- | --- |
| 平台能力与运行环境 | [平台能力](../src/client/platform.ts)，替换 [移动判断](../src/client/use-mobile.ts) 与 [原生窗口](../src/client/native/windows.ts) 的桌面假设 |
| 移动首页与加入 | [移动首页](../src/client/mobile/MobileHome.tsx)、[加入页](../src/client/MobileJoin.tsx)、[邀请](../src/client/Invite.tsx) |
| 邀请二维码 | [加入页](../src/client/MobileJoin.tsx)、[移动权限](../src-tauri/capabilities/mobile.json) |
| 移动大厅与本地开局 | [移动大厅](../src/client/mobile/MobileLobby.tsx)、[本地配置](../src/client/mobile/local-room.ts)、[大厅](../src/client/Lobby.tsx)、[本地连接](../src/client/connection.ts) |
| 移动设置 | [设置](../src/client/Settings.tsx)、平台能力层 |
| 语音会话与原生桥 | [语音会话](../src/client/voice/session.ts)、[原生传输](../src/client/voice/native-transport.ts)、[Rust 插件](../src-tauri/plugins/voice-native/)、[Swift 原生层](../src-tauri/mobile/ios/)、[移动命令](../src-tauri/src/mobile.rs) |
| iOS 工程与权限 | [Xcode 工程](../src-tauri/gen/apple/)、[iOS 配置](../src-tauri/tauri.ios.conf.json)、[权限说明](../src-tauri/Info.ios.plist)、[图标脚本](../scripts/build-ios-icons.mjs) |
| iOS 构建与 GitHub IPA | [准备脚本](../scripts/prepare-ios.mjs)、[包脚本](../package.json)、[iOS 工作流](../.github/workflows/ios.yml)、[统一发布](../.github/workflows/desktop.yml) |
| SwiftUI 外壳原型 | [原生工程](../ios-native/)、[启动脚本](../scripts/run-native-shell.mjs)、[界面评审](ui-review-workflow.md) |
| 验证 | [平台测试](../tests/platform.test.ts)、[原生传输测试](../tests/voice-native-transport.test.ts)、[本地配置测试](../tests/mobile-local-room.test.ts)、真机清单见本页 |
