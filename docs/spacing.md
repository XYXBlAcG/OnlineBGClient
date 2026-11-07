# 间距与展开规范

间距只从[设计变量](../src/client/ui/design-tokens.css)的 `--space-1` 到 `--space-8` 取值，不在组件里写新的像素常量。

| 标记 | 值 | 用途 |
| --- | --- | --- |
| `--space-1` | 4px | 图标与文字、`kbd`、同组内微调 |
| `--space-2` | 8px | 标签与值、按钮内部、折叠标题与内容 |
| `--space-3` | 12px | 同一组控件、设置行、段落之间 |
| `--space-4` | 16px | 卡片内边距、引导步骤内部 |
| `--space-5` | 20px | 设置分组内小标题上方 |
| `--space-6` | 24px | 设置分组标题上方、面板主分组 |
| `--space-8` | 32px | 页面级区块 |

- 垂直节奏由父容器负责。设置项、段落和按钮组之间使用 `--space-3`；分组标题与上一组内容之间使用 `--space-6`。
- 标题只保留下方间距，标题上方间距由相邻内容规则提供；禁止同时用 margin 和 gap 叠加同一段距离。
- `details` 展开后标题与内容固定间隔 `--details-content-gap`（`--space-2`），收起时只保留标题自身高度。
- 引导、详情和练习场的内部块间距使用 `--space-2` 到 `--space-4`，不使用负 margin 补偿。
- 移动端只压缩外层 padding，不压缩文字与控件的可点击间距。

实现入口：[设计变量](../src/client/ui/design-tokens.css)、[全局控件与折叠](../src/styles.css)、[设置间距](../src/client/ui/experience.css)、[引导布局](../src/client/BeginnerGuide.tsx)。
