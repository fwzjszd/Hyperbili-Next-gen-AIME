# 澎湃哔哩AIME版（HyperBilibili AIME）

> 一款为 **小米 Vela 可穿戴设备（手环 / 手表）** 打造的 **B 站快应用客户端**。  
> 在小屏上看视频、刷动态、发评论、读私信，全部用 Vela `.ux` 快应用语法实现。

---

## ✨ 功能概览

### 浏览与视频
- **首页推荐 / 热门 / 排行榜**：完整的视频流入口
- **视频详情页**：UP主信息、分P切换、简介、章节、一键三连、收藏
- **雪碧图（videoshot）逐帧预览**：通过 B 站 `videoshot` 接口生成雪碧图，裁切出每帧缩略图，点击即进入逐帧预览
- **评论区**：楼中楼、点赞、加载更多、评论图片展示
- **番剧 / 影视 / 直播 / 动态**：多内容板块统一呈现

### 私信与互动
- **会话列表**：@我 / 回复 / 点赞 / 私信会话
- **私信详情**：支持**向上滑动加载历史消息**的分页式浏览，可查看完整会话
- **评论回复**：快捷发送评论、支持表情、图片、楼层互动

### 自定义输入法（使用开源项目ResonaUI 内置输入法）
- **九键（T9）/ 全键盘（QWERTY）** 双模式自动切换
- **中文（拼音）・英文・日语（ローマ字 → 平仮名）三态语言切换**（中 / A / あ）
- **数字/符号**模式、候选词、退格、搜索键、光标移动键等完整编辑能力

### 账号与设置
- **扫码登录** / Cookie 登录 / 登出
- **缓存管理**：雪碧图、音频、临时文件一键清理
- **启动页 / 首页视频条数 / 图片开关 / 动画开关**等精细化设置
- **关于页**：版本信息、开源致谢、开发者鸣谢

---

## 🛠 技术栈

| 层级 | 选型 |
| :-- | :-- |
| 运行框架 | **Xiaomi Vela Quick App**（`.ux` 单文件组件） |
| 语言 | `.ux` 模板 + JavaScript / TypeScript 逻辑 + Less 样式 |
| 构建工具 | `@aiot-toolkit/cli` + webpack |
| 字节码 | `aiotjsc` 编译为 JSC 字节码（`--enable-jsc`） |
| 协议 | Protobuf JSON（`--enable-protobuf`） |
| UI 套件 | 项目自研 **ResonaUI**（页面过渡动画、通用 CSS 类、键盘辅助） |
| 包管理 | **Yarn 1**（`postinstall` 强制校验） |

---

## 📦 构建与安装

### 环境要求
- Node.js ≥ 18
- Yarn ≥ 1.22（项目禁止使用 npm / pnpm，`postinstall` 会校验）
- Windows / macOS / Linux 均可

### 构建命令
```bash
# 安装依赖
yarn install

# 发布构建（唯一可用的产物构建命令，见 AGENTS.md）
yarn release
```

构建成功后会在 `dist/` 目录生成：
```
dist/com.fwzjszd.hyperbilibili.dev.release.<版本号>.rpk
```
将 `.rpk` 通过 IDE 的设备调试入口或官方快应用侧加载工具写入设备即可。

### 调试
按 AGENTS.md，调试流程请走 IDE 内置的调试入口（Vela 设备选择器），命令行没有暴露调试流程。

---

## 📁 项目结构

```
HyperBilibili/
├── src/
│   ├── app.ux                    # 全局入口 + 通用 CSS (ResonaUI 基础)
│   ├── manifest.json             # 快应用 manifest (包名/权限/版本)
│   ├── config-watch.json         # 设备配置
│   ├── animation/                # 动画引擎 (ResonaUI 过渡)
│   ├── asyncapi/                 # file / storage 异步封装
│   ├── bilibiliclient/           # B 站 API 客户端
│   │   ├── api/request.ts        # 签名/请求封装
│   │   ├── video/video.ts        # 视频 + videoshot 裁切 URL 构造
│   │   ├── comment/              # 评论 + 楼中楼
│   │   ├── message/              # 私信会话 + 分页消息
│   │   └── ...
│   ├── common/                   # 图片资源 (icon/level/背景/按钮…)
│   ├── components/
│   │   ├── InputMethod/          # 内置输入法（中/英/日 + T9/全键盘）
│   │   ├── Video/ Article/ ...   # 通用展示组件
│   │   └── FullScreenInput/ …
│   ├── danmaku/engine.ts         # 弹幕引擎
│   ├── i18n/                     # 中/英文案
│   ├── image/jpegkmeans.ts       # 雪碧图 K-means 压缩 (小屏适配)
│   ├── less/                     # Less 变量 / 通用类
│   ├── logger/                   # 日志
│   ├── pages/
│   │   ├── app/features/         # 设置/关于/首页等应用级页面
│   │   ├── message/              # 私信列表(dmlist)、私信详情(dmpage,带分页)
│   │   ├── reply/                # 评论楼层
│   │   ├── search/               # 搜索
│   │   ├── user/                 # UP主/用户主页
│   │   └── video/                # 视频相关页面
│   │       ├── videodetail/      # 视频详情
│   │       ├── videocontent/     # 雪碧图下载/缓存/预览/播放入口
│   │       ├── spriteplayer/     # 雪碧图逐帧播放器(弹幕、进度、倍速)
│   │       ├── player/           # 音频/系统播放器
│   │       └── subtitle/         # 字幕渲染
│   ├── ui/ui.ts                  # ResonaUI 过渡控制
│   └── tools.ts / useful.js      # 通用工具 + 键盘/设备初始化
├── scripts/                      # 机型打包脚本 (S3/S4/RW5 等)
├── AGENTS.md                     # 开发约定（必读）
├── commitlint.config.js          # 提交规范
├── quickapp.config.js            # aiot-toolkit 配置
├── tsconfig.json
└── package.json
```

---

## 📝 开发约定

开发前 **务必阅读 [AGENTS.md](./AGENTS.md)**，核心要点摘要：

- **`.ux` 语法 ≠ Vue**，改动前对照 `VelaDocs/guide/framework/`（已从仓库移除，见官方文档）。
- 布局 = **Flex + 显式 `flex-direction`**；盒模型为 `border-box`；定位仅支持 `relative / absolute`。
- 文本只能放在 `<text>` / `<span>` 中。
- 尺寸单位：`px` 受 `manifest.json` 的 `config.designWidth` 影响；CSS 多屏适配使用 `dp` 值、JS 侧使用 `device.getInfo()` 初始化的 `global.screenSize.width`。
- **内存优先**：手环解码内存约 4MB，禁止批量预解码、禁止深层嵌套，长列表分批渲染，定时器及时清理。
- **动画**：不支持 0 值（必须 `0px` 或 `0%`，否则崩溃），不支持数值自减（需 `reverse` 或反转关键帧）。
- **构建**：唯一可用 `pnpm/yarn release`，禁止通过 `npm run dev` 之类流程生成发布包。
- **提交格式**：`type(scope): description`，见 `commitlint.config.js`。

---

## 🏗 机型脚本

`scripts/` 下为特定机型（Redmi 手表 S3/S4、Redmi Watch 5 Active 等）打包/裁剪脚本，按需调用：
- `build_s3s4.py`：S3/S4 机型
- `build_rw5.py`：Redmi Watch 5 系列


---

## 🧪 最近更新

以下为 **2.5.3** 版本当前 HEAD 提交的主要更新（`80f2bdd`）：

1. **输入法加回日语（あ）模式**
   - 新增 [src/components/InputMethod/assets/dicJp.js](./src/components/InputMethod/assets/dicJp.js)：罗马音→平假名完整映射（清音/浊音/半浊音/拗音/促音/撥音 + 替代拼写如 `si→し`、`ti→ち`）
   - 语言按钮改为文本三态切换：`中 ↔ A ↔ あ`
   - 所有屏幕（圆屏全键盘/T9、方屏、胶囊屏）的按钮、候选区、123 键、返回键均适配日语模式
   - 候选区实时将罗马音转换为平假名，点击后提交假名文本

2. **私信详情页分页加载**
   - `pages/message/dmpage/dmpage.ux`：`onscrolltop` 触发 `LoadHistoryMessages()`
   - 通过 `end_seqno` 做游标分页；加载完成后用 `scrollBy(…, behavior:"instant")` 保持滚动位置
   - 新增 `historyLoading / noMoreHistory / oldestSeqno` 三态管理与顶部「加载中/没有更多」提示

3. **雪碧图（videoshot）裁切/播放修复 & 入口禁用**
   - `bilibiliclient/video/video.ts`：新增 `buildVideoFrameCropUrl` 逐帧按需构造 CDN 裁切 URL（避免一次性构造几百个 URL 导致内存膨胀）
   - 帧数按 `index.length - 1` 计算（B站 `index[]` 长度=帧数+1），彻底修复黑边/越界裁切
   - 保留并传递 `originalImages / originalImgX/Y/Cols/Rows` 作为裁切基准，避免低画质本地化后坐标错位
   - `spriteplayer.ux`：画面固定 336×189（16:9）+ 无 `object-fit`，消除缩放偏移；移除损坏的背景图；弹幕改为单 50ms 计时器并节流释放；帧基准间隔对齐补丁版 700ms
   - `videocontent.ux`：**播放入口「雪碧图预览 / 播放」按钮目前改为 toast「该功能正在开发中」**，防止手表侧内存不足重启

4. **项目清理**
   - 从源码中移除非编译必需目录：`VelaDocs/`（官方文档可在线查阅）、`designs/`、`prototype/`
   - 移除本地参考 RPK、`cv_result.txt`、`commit_msg.txt`、`desktop.ini`、`.vscode/`
   - `.gitignore` 补充 `*.rpk / .vscode/ / designs/ / prototype/ / VelaDocs/` 等忽略项

---

## ⚠️ 免责声明

本项目开源仅用于 **学习与研究 Vela 快应用 + 小屏交互**。Bilibili® 为上海宽娱数码科技有限公司注册商标，本项目与官方无关。  
使用请遵守当地法律法规及目标平台的《服务条款》，不得用于任何商业用途。

---

## 📄 许可证

本项目基于 **GPL-3.0-only** 许可证开源，详见 [LICENSE](./LICENSE)。
