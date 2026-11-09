# 开发态手机房间

运行 `npm run dev` 后打开 [手机房间](http://127.0.0.1:1420/?dev=phone)，或运行 `npm run dev:phone` 后打开 `http://127.0.0.1:1421/?dev=phone`。该入口只在开发模式存在，正式构建不会包含。

在电脑客户端开好局域网或公网房间后，把邀请链接粘贴到手机房间地址栏。带 `room` / `service` 的邀请会转到当前开发客户端并加上 `device-preview=phone`，因此手机框内运行最新代码、真实连接房间服务；普通网页按原地址加载。

手机房间提供常用手机/平板尺寸、自定义宽高、旋转、适配缩放和重新载入。iframe 使用真实客户端，未复制规则或牌桌。不模拟触摸手势、软键盘、安全区、网络和手机性能；真实 iOS／Android 验收继续由用户执行。

## Native Shell 原型

运行 `npm run dev` 后打开 `http://127.0.0.1:1420/?dev=native-shell`。这是 SwiftUI 外壳的浏览器视觉原型，不连接真实房间，不替代真机验收。

支持查询参数直接打开状态：`screen=home|lobby|join|settings|table`、`theme=dark`、`orientation=landscape`、`island=off`、`safe=off`、`motion=off`、`hand=uno|ddz`。

## 实现入口

- [手机房间](../src/client/dev/PhoneRoom.tsx)、[样式](../src/client/ui/phone-room.css)
- [Native Shell 原型](../src/client/dev/NativeShellPreview.tsx)、[原型状态](../src/shared/native-shell.ts)、[样式](../src/client/ui/native-shell-preview.css)
- [尺寸、适配与链接改写](../src/shared/phone-preview.ts)
- [手机预览标记](../src/client/phone-preview.ts)、[手机判断](../src/client/use-mobile.ts)、[横竖屏视口](../src/client/use-mobile-viewport.ts)
- [定向测试](../tests/phone-preview.test.ts)、[Native Shell 测试](../tests/native-shell-preview.test.ts)、[游戏图标测试](../tests/game-icon.test.tsx)
