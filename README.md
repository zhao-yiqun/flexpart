# FlexPart homepage and video

成片：`assets/flexpart-film.mp4`，1920 × 1080，30 fps，2 分 18 秒。
视频标题使用 Manrope，prompt、标注和字幕使用 Inter；字体随工程本地打包，
渲染前显式加载并验证，避免系统字体替代。单独的口号页已移除，口号仅保留在片尾标题页。
英文字幕已放在画面里，另提供 `captions-en.srt` 和 `captions-en.vtt`。
这是无配音版本。网站提供 H.264 MP4 和 VP9 WebM 两种播放格式。

打开 `index.html` 可看主页；推荐通过 HTTP 预览以支持章节跳转和字幕：

```bash
cd /apdcephfs_cq12/share_360969/yiqun/Paper/CVPR_page/homepage
python3 -m http.server 8765
```

然后访问 `http://localhost:8765/`。`flexpart-homepage.zip` 是可直接部署到
GitHub Pages 的纯静态网站包，不需要 Node 服务或构建步骤。未向 GitHub 推送、
未发布到公开网站。源码和媒体都在本目录，论文目录没有被修改。

## 内容与时间线

| 时间 | 内容 |
| --- | --- |
| 00:00–00:04 | FlexPart 开场 |
| 00:04–00:17 | 输入 geometry、再输入 control prompt、输出分割 |
| 00:17–00:35 | 多视角与粒度请求 → visual planner → 三个粒度 |
| 00:35–00:51 | 指定两把剑和双手；其余部件明确归为 background |
| 00:51–01:11 | 固定几何和模型，只切换 coarse / medium / fine prompt |
| 01:11–01:19 | 三块汇入论文 teaser 原排布，强调 all in one model |
| 01:19–01:24 | AIGC generalization 引入 |
| 01:24–01:34 | Tracked machine，三个粒度同屏同步旋转 |
| 01:34–01:44 | Sci-fi blaster，三个粒度同屏同步旋转 |
| 01:44–01:54 | Armored character，三个粒度同屏同步旋转 |
| 01:54–02:04 | Winged robot，三个粒度同屏同步旋转 |
| 02:04–02:10 | 四个 AIGC asset 的三级粒度总览 |
| 02:10–02:18 | 完整论文标题、what you ask for is what you get 与三个示例 |

转台使用固定相机、固定灯光，模型绕自身中心旋转。三个粒度使用相同角度，
每组 10 秒完成一圈；没有依次给每个粒度单独留时长。

## 主要文件

- `index.html`, `style.css`, `site.js`：主页，可切换能力标签、跳转视频章节、统一播放和暂停四组转台。
- `assets/flexpart-film.mp4`：可下载的完整成片。
- `assets/asset{1,2,3,4}-turntable.mp4`：每个 asset 的三个粒度同框、无文字转台片段。
- `storyboard.jpg`：12 帧分镜总览。
- `film.js`, `film.html`：可编辑动画源。每一帧由时间确定，无实时录屏掉帧。
- `source-manifest.json`, `mesh-preparation.json`：素材来源与显示模型处理记录。
- `verification.json`：浏览器检查结果。
- `assets/method-pipeline.webp`：正文 Figure 2 方法框架图。
- `assets/results-{tiny,granularity,selective,ablation}.webp`：正文 Figures 3–6；主页保留条件说明及相应 PDF 页码链接。
- `assets/fonts/`：本地 Manrope / Inter 字体及 OFL 许可证。
- `review/before-typography/`：本次字体和片尾修改前的成片与源码备份。
- `review/homepage-{desktop,mobile}.png`：桌面和手机端实际截图。

## 素材和结果约定

素材来自 `/apdcephfs_cq12/share_360969/yiqun/Paper/CVPR27_partseg`。
Teaser 使用当前 `figures/teaserv4.pdf`，直接提取内嵌图像而不是依赖过期 PPT
导出；合并场景使用同一个 PDF 的完整布局。

四个 AIGC UID 和来源按 `figures/7_aigc/SOURCE.json` 及实际渲染 manifest 解析：

1. `2e686eb0-1036-4fe5-a372-49a070058871`
2. `4d1750c2-db2b-427b-9d42-80fa742ab6f5`
3. `08671bba-5610-4b12-b15f-a79a30d5a9f8`
4. `2357c8e5-e5ed-4b8e-aa50-33a1157978cb`

旋转使用实际预测 GLB。为视频显示，每个原始 part 独立作网格简化，保留 part
身份、颜色与场景变换；没有合并分割标签、运行新推理或改写原始结果。显示副本在
`assets/models`，精确 prompt 侧文件与副本相邻。视频图示里的 prompt 是延续论文
teaser 的节选，完整输入不被这些演示文字替代。

论文 Fig. 7 本来包含不同运行来源；本视频沿用其来源，不声称四个案例来自同一个
checkpoint。All-in-one 指 FlexPart 同一模型设计支持三种文本控制方式。不同粒度
的颜色用来区分各自标签，不表示跨层级颜色必然一一对应。

主页的 `paper.pdf` 从当前论文源码在独立临时目录重新编译。原目录已有 PDF 的
尾部不完整、无法读取页面，因此没有将该坏文件作为下载件，也没有覆盖它。

## 重建

本机使用 `miniconda3/envs/segvigen/bin/python`（Pillow、PyMuPDF、trimesh、
fast-simplification、imageio-ffmpeg），Node 22 + npm lockfile，Playwright 和 Three.js。
外部浏览器及运行库位于工作区 `tmp/flexpart-browsers`、`tmp/flexpart-browser-libs`。

```bash
npm ci
bash scripts/run-render.sh preview
/apdcephfs_zwfy2/share_303204533/yiqun/miniconda3/envs/segvigen/bin/python scripts/rebuild.py
```

`scripts/prepare.py` 提取论文素材；`scripts/prepare-meshes.py` 生成转台显示副本；
`scripts/paper-figures.py` 提取正文方法和实验图；`scripts/rebuild.py` 重建六个片段并刷新全部成片、字幕、部署包和验证记录。
`scripts/build-paper.py` 在隔离副本中编译 PDF；`scripts/finalize.py` 汇总片段、
生成字幕和转台短片、制作 WebM 与部署包。转台的速度和镜头在 `film.js` 的
`singleAsset` / `renderMesh` 中调整，字幕与网页章节在相应源文件中同步修改。

渲染需要本地浏览器与 localhost 监听权限。仅打开部署包的静态主页不需要这些
制作依赖，也不会触发训练、推理或任何外部 API。
