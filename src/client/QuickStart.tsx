import "./ui/quick-start.css";
export function QuickStart({
  desktop,
  expanded,
  onExpandedChange,
  onVoiceSettings,
}: {
  desktop: boolean;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onVoiceSettings: () => void;
}) {
  return (
    <section className="quick-start" aria-label="快速上手">
      <div className="quick-start-heading">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="quick-start-content"
          onClick={() => onExpandedChange(!expanded)}
        >
          快速上手
        </button>
        {desktop && (
          <button
            type="button"
            className="primary-button"
            onClick={onVoiceSettings}
          >
            连麦设置
          </button>
        )}
      </div>
      {expanded && (
        <div id="quick-start-content" className="quick-start-steps">
          <div>
            <strong>1 · 选游戏</strong>
            <p>自己玩选本地对局，和朋友玩选跨网络联机；AI 可以补足席位。</p>
          </div>
          <div>
            <strong>2 · 邀请朋友</strong>
            <p>
              房主创建临时公网房间，把邀请链接发给朋友。加入者粘贴链接，手机直接用浏览器打开。
            </p>
          </div>
          <div>
            <strong>3 · 一起开玩</strong>
            <p>
              玩家准备后由房主开始。想连麦请双方使用客户端；只有房主需要配置语音服务。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
