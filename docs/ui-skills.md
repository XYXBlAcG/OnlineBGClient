# UI 设计技能

工作区 `.agents/skills/` 安装了三套 UI 设计技能，供实现与审核界面时加载。

| 技能 | 用途 | 来源 |
| --- | --- | --- |
| [`frontend-design`](../.agents/skills/frontend-design/SKILL.md) | 视觉方向、字体、布局与非模板化设计流程 | [anthropics/skills](https://github.com/anthropics/skills) |
| [`ui-ux-pro-max`](../.agents/skills/ui-ux-pro-max/SKILL.md) | 样式库、产品色板、字体搭配、UX 准则与实现栈检索 | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| [`apple-design`](../.agents/skills/apple-design/SKILL.md) | 基于 Apple HIG 的界面评审、可访问性与暗色模式检查 | [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill) |

使用方式：实现或评审界面时用技能加载工具载入对应技能；技能文件随仓库分发，无需额外安装。
