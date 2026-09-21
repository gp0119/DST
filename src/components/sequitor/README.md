# 追随者谜题

从 dst-uniapp 的 `src/packages/sequitor` 移植，入口为 `/sequitor/`。
保留三种题型、镜像、提示、石柱及追随者动画、音效、持久化静音和方向键操作。
当前界面与源页面一致，使用不计时的练习模式。

`rules.js` 保留原规则，依据本机 Steam《饥荒联机版》build 24700692 的
`abysspillar_trial.lua` 和 `abysspillar.lua`：相对转向、依序预占落脚点及上下岸规则。
每步使用 420ms 动画锁。音效使用浏览器 Audio，切换到后台停止，组件卸载释放。

图片统一放在 `public/images/sequitor/`，威尔逊头像复用 `public/images/characters/wilson.png`，
Vue 通过项目共用的 `assetUrl` 引用，支持部署路径前缀。
石柱、追随者与拉杆素材来自游戏动画包，`public/images/sequitor/audio/` 中声音来自 `rifts6.fsb`，
原始素材归 Klei 所有。所有素材均为本地资源，无远程依赖。
