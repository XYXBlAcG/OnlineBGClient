# 手机网页预览

项目目录运行 `npm run preview:phone`，在电脑浏览器打开 [手机预览](http://127.0.0.1:1421/phone-preview.html)。可直接创建本地对局，也可在地址栏粘贴已经运行的房间邀请链接。

切换预设或自定义宽高、旋转横竖屏，不重新加载牌桌；外框比例只调整电脑上的显示大小，不改变选定的网页逻辑尺寸。「重新载入」会重新加载网页，未保存的本地对局可能丢失。

预览使用真实客户端，未复制游戏规则或牌桌。该页面通过 iframe 中的显式标记启用本项目的手机界面；外部网站不会因此获得触屏设备模拟，且可能禁止 iframe 加载。旧版已运行的服务需更新客户端资源，才支持这一标记。

鼠标点击与滚轮用于人工检查布局、菜单、聊天及滚动。该工具不模拟设备引擎、触摸手势、软键盘、安全区、网络或手机性能；真实 iOS／Android 验收继续由用户执行。

## 实现入口

- [预览页面](../public/phone-preview.html)、[交互](../public/phone-preview.mjs)、[尺寸和链接策略](../public/phone-preview-model.mjs)
- [手机预览标记](../src/client/phone-preview.ts)、[手机判断](../src/client/use-mobile.ts)、[横竖屏视口](../src/client/use-mobile-viewport.ts)
- [定向测试](../tests/phone-preview.test.ts)

图片收发跨域策略复用 [开发端口配置](../src/shared/development.ts)；服务入口见 [跨域处理](../src/server/cors.ts)，真实 HTTP 回归见 [图片预检与收发](../tests/media-cors.test.ts)。预览页面与房间服务需要使用同一版代码。
