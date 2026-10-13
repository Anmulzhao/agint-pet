# 鲸鱼娘·萝莉（jyn-loli）

由 stushansusu（涂山苏苏）为 DSH 桌面宠物制作的 frames2d 宠物：由 **MiniMax H3 图生视频**产出的
**10 条轨道、720 帧**。与 `assets/jyn`（女仆鲸鱼娘）、`assets/jyn-foxtail`（鲸鱼娘·狗尾巴草）
同属「鲸鱼娘」角色线。

## 包里有什么

| 项 | 值 |
| --- | --- |
| 轨道 | **10 条** —— `idle`（循环）· `scratch-head` / `whale-pillow` / `lollipop` / `dance-sway`（播一遍回 idle）· `work`（循环）· `work-success` / `work-fail`（播一遍回 work）· `rest`（播一遍）→ `resting`（循环） |
| 帧 | 每轨 **72 帧 × 40 ms = 2880 ms**，共 **720 帧** |
| 单元 | **764×1172**，十轨统一（宿主按帧高缩放，所以十条轨道显示大小完全一致） |
| 玩法 | `stats` / `idleDirector`（4 个待机小动作）/ `hitBox` / `touch`（三个触摸区 + `clickBoost`）/ `work` / `sleep` / `passiveIncome` / `shop` |
| 体积 | **84 MB**（帧 70.4 MB + 10 条轨道 GIF 预览 13.6 MB） |

## 来源

- **角色**：「鲸鱼娘」的萝莉形态，与本仓库的 `assets/jyn`、`assets/jyn-foxtail` 同一条角色线。
- **立绘**：一张 **1184×1920 RGBA 已抠像**的 PNG（透明区 RGB 为纯白；可见内容包围盒 1043×1774），
  由作者以 **AI 生成（DeepSeek）** 后提供。
  ⚠️ 与 jyn-q 的立绘不同，**这个 PNG 里没有任何文本块**（既无 XMP 也无 TC260 AIGC 标识），
  所以此处「生成工具」的归属来自**作者陈述**，不是从文件元数据读出来的。
- **帧**：MiniMax **H3 fl2va**（图生视频）在本机 ComfyUI 上逐条生成 —— **73 帧 @24fps = 3.042 s**，
  首帧与尾帧喂**同一张图**，模型因此被夹回起始姿势，**有效周期 = 72 帧**；再把 73 帧等时重采样成 72 帧，
  于是每条轨道首尾天然闭合。整条「视频 → frames2d」产线（含踩过的坑）记在生成侧仓库的 `docs/h3-to-frames2d.md`。
- **十轨共用一个裁切框**：取全部轨道全部保留帧的 alpha 并集、按几何中心对称补边成 **764×1172**，
  所以切轨道时角色既不跳大小也不跳位置。打工三轨（碗 / 圆肚子 / 彩虹）的并集完整落在角色原轮廓以内，
  成品框高度增长 **0 px** ⇒ 角色显示尺寸 **100%**。

## 授权与声明

- **贡献与许可**：本宠物（帧序列、`pet.json`、`previews/`）由 stushansusu 以 **MIT** 许可证贡献；
  manifest 记 `author: 11726`、`license: MIT`。`11726` 与 stushansusu 是同一作者的两个署名
  —— 这条角色线上资产的 `pet.json` 都记 `11726`（jyn / jyn-foxtail / doro 亦然），
  而 `THIRD_PARTY_NOTICES.md` 与 README 的内置宠物表按 GitHub 账号记 stushansusu，
  Doro 条目已先记录过这一对应关系。
- **角色权利**：「鲸鱼娘」是对 DeepSeek 鲸鱼标识的**非官方同人**形象，DeepSeek 名称与鲸鱼标识的
  相关权利归 DeepSeek 所有。本作为粉丝二创，与 DeepSeek 无隶属或背书关系，不表述为官方作品，
  也不主张角色本身的任何权利。
- **使用范围**：仅限个人非商业使用 —— 不得售卖、不得商用、不得表述为官方；本仓库 MIT 覆盖的是
  贡献者产出的帧序列与清单，不覆盖角色本身。
- 第三方声明见仓库根 `THIRD_PARTY_NOTICES.md` 的 **Jyn-Loli pet (assets/jyn-loli/)** 条目。

## 为什么不在 `package.json` 的 `files` 白名单里

本包 **84 MB**，与 `assets/jyn`（113.9 MB）、`assets/doro`（55.5 MB）、
`assets/jyn-foxtail`（14.9 MB）同属「只放仓库、不随 npm 包发布」的那一档；
只有轻量的内置宠物（如 jyn-q，5.6 MB）才写进 `files`。想把它变成内置宠物，
在 `package.json` 的 `files` 里加一行 `"assets/jyn-loli"` 即可。
