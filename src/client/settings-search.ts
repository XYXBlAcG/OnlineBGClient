export interface SettingsSearchSection {
  label: string;
  terms: string;
  requires?: "desktop" | "voice";
}

export const settingsSearchSections: SettingsSearchSection[] = [
  {
    label: "外观",
    terms:
      "主题 浅色 深色 跟随系统 界面动画 游戏动画 大厅切换动画 减少动态 动效 表情 Emoji 头像 显示聊天侧栏 显示首页快速上手 显示首页连麦设置入口 连麦入口",
  },
  {
    label: "界面显示",
    terms:
      "界面字体 字号 界面元素 缩放 牌桌元素 牌桌大小 台球渲染 台球 3D 2D 自动 显示帧率 帧率 FPS 预设 标准 舒适 大 恢复默认",
  },
  {
    label: "消息与互动",
    terms:
      "横幅 全屏表情 颜色 默认横幅文字颜色 本机显示横幅与全屏表情 提示音 音效音量 台球音效 击球 落袋 消息提示音 系统通知 桌面系统通知 头像互动 显示头像互动 互动音效 派对 演出",
  },
  {
    label: "声音与语音",
    terms: "麦克风 扬声器 语音 连麦 变声 设备与连麦设置 设备 测试",
    requires: "voice",
  },
  {
    label: "软件更新",
    terms: "版本 更新 自动更新 自动下载 下载 进度 通道 检查更新",
    requires: "desktop",
  },
  {
    label: "软件日志",
    terms: "日志 诊断 错误 报告 导出",
    requires: "desktop",
  },
  {
    label: "使用统计",
    terms: "使用时长 统计 tokens 模型 用量",
    requires: "desktop",
  },
  {
    label: "联机",
    terms:
      "临时公网 自动创建临时公网入口 代理 直连失败后尝试代理开房 HTTP 代理地址 局域网 显示局域网调试开房 服务地址 自定义房间服务地址 网络",
    requires: "desktop",
  },
  {
    label: "AI 计算",
    terms:
      "CPU 加速 单线程 多线程 线程上限 显示计算详情 显示 AI 性能测试 记录并显示策略审核 策略审核",
  },
  { label: "常用语", terms: "短语 快捷回复 分组 常用语" },
  { label: "数据", terms: "缓存 清理 媒体 回放 记录 存储 数据" },
  { label: "成就", terms: "成就 解锁 稀有度 游戏 进度 测试成就弹窗 搜索" },
  {
    label: "快捷键",
    terms: "快捷键 绑定 键盘 按键 组合键 命令 语音 当前游戏",
    requires: "desktop",
  },
];

export function searchSettingsSections(
  query: string,
  desktop: boolean,
  voice = desktop,
) {
  const search = query.trim().toLowerCase();
  return settingsSearchSections.filter(
    (section) =>
      (!section.requires ||
        (section.requires === "desktop" ? desktop : voice)) &&
      (!search ||
        `${section.label} ${section.terms}`.toLowerCase().includes(search)),
  );
}
