import { ExternalLink } from "../ExternalLink";
export function VoiceSetupGuide({
  configured,
  onConfigure,
}: {
  configured: boolean;
  onConfigure: () => void;
}) {
  return (
    <section className="voice-setup-guide" aria-label="连麦快速上手">
      <div className="voice-heading">
        <strong>第一次连麦</strong>
        <button type="button" onClick={onConfigure}>
          {configured ? "查看房主配置" : "配置房主语音"}
        </button>
      </div>
      <ol>
        <li>
          <strong>我是房主：</strong>在{" "}
          <ExternalLink name="livekit">LiveKit Cloud</ExternalLink>{" "}
          创建项目，在项目设置的 Keys 中取得 API Key 和 Secret，并复制 wss://
          开头的项目地址，填写下方配置。
        </li>
        <li>
          <strong>保存后开房：</strong>
          创建跨网络房间。已有房间请关闭后重新创建，再发送新的邀请链接；其他玩家不用填写服务配置。
        </li>
        <li>
          <strong>我是加入者：</strong>用客户端进入同一房间，打开「聊天 →
          房间语音 → 加入语音」。加入后默认静音，点击开启麦克风并允许系统权限。
        </li>
      </ol>
      <p className="muted">
        浏览器和手机本轮只支持游戏与文字聊天。先用下方「测试麦克风」检查设备；语音服务与临时公网游戏入口分别连接。
      </p>
    </section>
  );
}
