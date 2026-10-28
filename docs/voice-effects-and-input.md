# 变声、快捷键与横幅审核

当前 `.app` 从[审核入口](review-and-submit.md)获取。界面、设备、耳返与真实连麦由用户手动验收；助手不操作界面或麦克风。

## 使用入口

- 变声：设置 → 声音与语音 → 变声器。选择预设、强度或自定义音高；测试麦克风并开启耳返可试听。聊天底部也可切换预设和恢复原声。选择变声不会自动开麦。
- 输出：不支持程序选扬声器的平台跟随系统输出。更换系统输出后再测试；支持的平台可选择具体设备，切换失败时保留通话并显示提示。
- 快捷键：设置 → 快捷键，点击当前组合键进入录入。Esc 取消，Delete 清除单项；冲突与系统保留组合会显示错误。显示采用当前平台格式，保存仍使用规范键名。
- 横幅：设置 → 消息与互动 → 默认横幅文字颜色。影响自己发送的文字横幅；指令中的显式颜色或样式优先，例如 `/title --color #66CCFF 好牌`。本机关闭横幅仍会隐藏全部横幅。

## 手动检查

1. macOS 首次静音加入语音，确认不再被输出切换报错中断；检查输入电平、耳返和系统输出。Windows 测试选择扬声器及切回系统默认。
2. 两台客户端分别开麦，使用氦气声、升降八度和其他预设，核对接收方听到的声音与本机试听。切换不应重新申请权限，静音、禁言和按键说话仍有效。
3. 通话中修改效果、重连和更换麦克风；退出语音、停止试听、关闭设置后确认麦克风释放，无残留回声或异常峰值。
4. macOS 快捷键显示 ⌘、⌥、⇧ 等符号，Windows 显示 Ctrl、Alt 等文字；录入、取消、冲突、清除和重启后保留均正确。在原生设置窗口修改后回到游戏验证实际动作。
5. 按钮、标题不可拖选，聊天正文、错误、邀请链接和输入框仍可选择复制。
6. Windows 在两个动画选项均关闭时发送大字、表情和倒数，检查入场、强调、退场；开启系统减少动态效果后使用静态反馈。检查发送方与接收方颜色一致、显式参数优先及回放颜色。

## 实现与非界面检查

| 内容 | 入口 |
| --- | --- |
| 预设、参数及偏好 | [效果定义](../src/domain/voice-effects.ts)、[语音契约](../src/domain/voice.ts) |
| 通话与试听共享音频图 | [处理链](../src/client/voice/effect-graph.ts)、[SDK 处理器](../src/client/voice/effect-processor.ts)、[试听](../src/client/voice/probe.ts) |
| 输出能力和默认路由 | [输出策略](../src/client/voice/audio-output.ts)、[媒体](../src/client/voice/livekit.ts)、[会话](../src/client/voice/session.ts) |
| 组合键格式、注册快照和录入 | [命令](../src/client/commands.ts)、[编辑器](../src/client/KeyBindingEditor.tsx) |
| 社交动画与发送颜色 | [动画策略](../src/client/motion-policy.ts)、[横幅](../src/client/social/BannerLayer.tsx)、[解析与校验](../src/domain/banner.ts) |
| 处理器实际样本检查 | [离线脚本](../scripts/verify-voice-effects.mjs)、[结果](../artifacts/voice-effects/dsp.json) |
| 生命周期与设备边界 | [处理链检查](../tests/voice-effect-lifecycle.test.ts)、[入口检查](../tests/voice-ui-repair.test.tsx)、[会话](../tests/voice-session.test.ts) |

离线脚本执行安装包中的真实 AudioWorklet 算法，不启动浏览器或麦克风。测量包括频率、有效信号时长、处理器内部起始缓冲与离线执行耗时，不代表声卡延迟、设备 CPU 占用、跨网络延迟或真人音质。当前跨网连麦仍需用户验收。
