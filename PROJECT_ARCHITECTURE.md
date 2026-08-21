# HyperBilibili 项目架构与功能实现文档

## 一、项目概述

HyperBilibili 是一款运行在小米 Vela 快应用平台上的第三方哔哩哔哩客户端，专为智能手表与智能手环等小屏设备设计。项目采用 Vela QuickApp 框架（类小程序技术栈），使用 .ux 文件作为页面组件（模板 + 脚本 + 样式），TypeScript 编写核心业务逻辑，Less 编写样式。

**支持的设备类型**：
| 平台 | deviceType | designWidth | 说明 |
|------|-----------|-------------|------|
| 智能手表 | `watch` | `device-width` | 完整功能版本（视频播放、专栏阅读、评论图片等） |
| 智能手环（Ring 系列，如 band9） | `band9` | `192px` | 精简版，无原生 fetch 能力，网络请求通过 Android 同步 App 转发；移除非必要功能（视频播放、专栏阅读等）以保证流畅 |

**技术栈**：
- 框架：小米 Vela QuickApp（类微信小程序 / 华为快应用 标准）
- 页面文件：`.ux`（template + script + style 三段式）
- 业务逻辑：TypeScript
- 样式：Less
- 包管理：Yarn
- 构建工具：aiot-toolkit
- 跨设备通信：Interconnect（手环 ↔ 手机同步 App）
- 网络转发：FetchProxy（手环通过手机代理请求 B 站 API）

---

## 二、目录结构总览

```
src/
├── app.ux                    # 应用入口，全局初始化
├── manifest.json             # 应用配置（包名、权限、路由等）
├── i18n/                     # 国际化（zh.json / en.json）
├── animation/                # 动画引擎
│   ├── engine.ts             # 动画引擎核心
│   ├── defaults.ts           # 默认动画注册
│   └── defaults/             # 默认动画配置
│       ├── loading.ts        # 加载动画
│       └── page.ts           # 页面切换动画
├── asyncapi/                 # 异步 API 封装（Promise 化）
│   ├── file.ts               # 文件操作异步封装
│   └── storage.ts            # 存储操作异步封装
├── interconnect/             # 跨设备通信模块（Ring 系列手环专用）
│   ├── interconnect.ts       # 通信引擎核心：消息发送、响应机制、连接状态机
│   └── messageTypes.ts       # 消息类型常量：FETCH_REQUEST、FETCH_RESPONSE、PING、PONG 等
├── fetchproxy/               # 网络请求代理（Ring 系列手环专用）
│   └── fetchProxy.ts         # 将 fetch 请求通过 Interconnect 转发给 Android 同步 App，返回 Promise<response>，自动解析 JSON 响应
├── bilibiliclient/           # B站 API 客户端（核心业务层）
│   ├── client.ts             # 客户端主类（组合模式）
│   ├── api/request.ts        # HTTP 请求封装（get/post，自动携带 Cookie）
│   ├── account/
│   │   ├── login.ts          # 二维码登录、Cookie 登录、登出
│   │   └── accountData.ts    # 用户信息、登录状态
│   ├── video/
│   │   ├── video.ts          # 视频详情、播放地址、推荐、雪碧图、字幕
│   │   └── action.ts         # 点赞、投币、收藏、稍后再看
│   ├── article/article.ts    # 专栏列表、详情、搜索
│   ├── comment/comment.ts    # 评论列表、发布、回复、点赞
│   ├── user/user.ts          # 用户空间、关注/取关、用户关系
│   ├── folder/
│   │   ├── favfolder.ts      # 收藏夹列表、收藏视频
│   │   └── history.ts        # 历史记录
│   ├── message/message.ts    # 私信、@我、回复我、点赞我
│   ├── search/search.ts      # 搜索视频、用户、专栏、综合
│   ├── dynamic/dynamic.ts    # 动态列表、详情
│   └── utils/utils.ts        # 工具函数（API 签名等）
├── common/                   # 静态资源（图片、图标、序列帧）
│   ├── icon/                 # 播放器图标
│   ├── bililevel/            # B站等级图标
│   ├── bilivip/              # VIP 图标
│   ├── seqanims/             # 序列帧动画（loading、login等）
│   ├── guides/               # 引导页图片
│   ├── pagebg/               # 页面背景图
│   └── ...                   # 其他杂项图标
├── components/               # 可复用组件
│   ├── Article/              # 文章展示组件
│   ├── BetterOnlineImage/    # 优化的在线图片（加载状态、错误占位）
│   ├── DefaultButton/        # 标准按钮组件
│   ├── DynShow/              # 动态展示组件
│   ├── FloatingPageChanger/  # 浮动页码切换器
│   ├── FloatingSendBox/      # 浮动发送框
│   ├── FullScreenInput/      # 全屏输入
│   ├── HtmlRenderer/         # HTML 递归渲染器
│   └── InputMethod/          # 内置输入法（手表端软键盘）
├── pages/                    # 页面
│   ├── app/
│   │   ├── arealist/         # 区域列表页（底部导航容器）
│   │   ├── entry/            # 入口页面组
│   │   │   ├── splash/       # 启动页（开屏动画）
│   │   │   ├── prepage/      # 准备页（初始化过渡）
│   │   │   ├── login/        # 登录页（二维码登录）
│   │   │   ├── introduction/ # 引导页（首次使用指引）
│   │   │   └── eularead/     # 协议页（用户协议阅读）
│   │   └── features/         # 主要功能页
│   │       ├── main/         # 首页（推荐视频列表）
│   │       ├── mypage/       # 我的页面
│   │       ├── settings/     # 设置页组
│   │       │   ├── performance/    # 性能设置
│   │       │   ├── cleartmp/       # 清除缓存
│   │       │   ├── about/          # 关于应用
│   │       │   ├── donation/       # 捐赠
│   │       │   ├── opensoftware/   # 开源软件声明
│   │       │   └── checkupdates/   # 检查更新
│   │       ├── dynamic/    # 动态页
│   │       │   └── detail/ # 动态详情
│   │       ├── savedcontent/     # 已缓存内容
│   │       └── watchlater/       # 稍后再看
│   ├── video/                # 视频相关页
│   │   ├── videodetail/      # 视频详情（分P选择、章节入口、工具栏）
│   │   ├── videocontent/     # 视频内容（雪碧图下载/查看、音频下载/播放、字幕查看入口）
│   │   ├── spriteviewer/     # 雪碧图查看（整图缩放+拖拽平移）
│   │   ├── subtitleviewer/   # 字幕查看（多语言选择、分条显示）
│   │   ├── chapters/         # 章节列表与跳转
│   │   └── player/           # 音频播放器（字幕同步显示、章节跳转）
│   ├── article/              # 专栏相关页
│   │   ├── articleshow/      # 专栏展示
│   │   └── articlesave/      # 专栏缓存保存
│   ├── reply/                # 评论相关页
│   │   ├── replys/           # 评论列表
│   │   └── replytools/       # 评论操作菜单
│   ├── search/               # 搜索相关页
│   │   ├── search/           # 搜索主页
│   │   └── searchresult/     # 搜索结果
│   ├── user/                 # 用户空间
│   │   ├── user.ux           # 用户主页
│   │   ├── userdynamic/      # 用户动态
│   │   └── uservideos/       # 用户视频
│   ├── folders/              # 收藏夹 / 历史
│   │   ├── favfolders/       # 收藏夹列表
│   │   │   └── foldervideos/ # 夹内视频
│   │   └── history/          # 历史记录
│   ├── message/              # 消息页
│   │   ├── messages/         # 消息分类列表
│   │   ├── dmlist/           # 私信会话列表
│   │   └── dmpage/           # 私信聊天页
│   ├── tools/                # 工具页
│   │   ├── imagegallery/     # 图片画廊
│   │   ├── picturedetail/    # 图片详情
│   │   └── textdetail/       # 文字详情
│   ├── debug/componentstest/ # 组件测试页（开发用）
│   └── error/                # 错误页
│       ├── networkerror/     # 网络错误
│       ├── permissionerror/  # 权限错误
│       ├── screenwidtherror/ # 屏幕宽度不兼容
│       └── sessionood/       # 登录失效
├── ui/
│   └── ui.ts                 # UI 引擎（虚拟页面池、页面栈管理）
├── logger/
│   └── logger.ts             # 日志模块
├── settings.ts               # 设置管理（加载、保存、默认值）
├── savedcontent.ts           # 缓存内容管理（专栏、视频音频、视频雪碧图）
├── watchlater.ts             # 稍后再看管理
├── articletools.ts           # 专栏工具（HTML 生成、内容适配）
├── htmlparser.ts             # HTML 解析器（解析为渲染节点树）
├── tools.ts                  # 通用工具（数字格式化、设备信息、网络等）
├── bgimg.ts                  # 背景图管理
├── buildinfo.ts              # 构建信息（自动生成，版本、编译日期等）
├── usertracker.ts            # 用户行为追踪
├── jumpcheck.ts              # 跳转检查（页面跳转前的校验逻辑）
├── funnytips.ts              # 趣味提示文案
├── eula.ts                   # 用户协议内容
└── tsimports.ts              # TypeScript 模块导入统一入口
```

---

## 三、核心模块详解

### 3.1 应用入口 app.ux

**文件**：[app.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/app.ux)

`app.ux` 是整个应用的入口，在 `onCreate` 生命周期中完成全局初始化：

1. **日志系统**：创建全局 `global.logger`
2. **UI 引擎**：初始化自定义 UI 引擎 `global.ui.Init()`
3. **动画引擎**：`global.animengine`
4. **设置加载**：从本地存储读取用户设置
5. **缓存管理**：初始化 `SavedContentManager`（已缓存的专栏/视频音频/雪碧图）
6. **稍后再看管理**：初始化 `WatchLaterManager`
7. **设备信息**：获取设备屏幕尺寸、型号、序列号、网络类型等
8. **背景图管理**：`bgimg.Init()`
9. **B站客户端**：创建 `BilibiliClient` 实例

> 注意：Vela 中设备信息获取可能失败（如模拟器不支持），所有 API 调用都用 try-catch 包裹并提供默认值，防止应用启动中断。

### 3.2 manifest.json 应用配置

**文件**：[manifest.json](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/manifest.json)

核心配置项：
- **package**：包名 `com.fwzjszd.hyperbilibili.dev`
- **versionName / versionCode**：版本号（当前 v2.5.3，versionCode=5）
- **deviceTypeList**：手表版为 `["watch"]`，手环版（Ring 系列）为 `["band9"]`
- **features**：声明使用的系统能力（router, request, audio, file, device, fetch, storage, network 等；手环版如无 fetch 需通过 fetchproxy 代理）
- **permissions**：权限声明（`hapjs.permission.DEVICE_INFO` 仅在需要序列号时添加，模拟器不支持该权限，默认不建议加以避免启动报错）
- **config.designWidth**：手表版设为 `"device-width"` 自适应，手环版（band9）需固定 `"192px"`
- **router.pages**：路由表，所有页面必须在此注册，组件名需唯一

> 重要约束：Vela 快应用中组件名必须唯一，重复的组件名会导致路由跳转失败。手环版（band9）构建时需精简路由（移除 articleshow、player 等页面），避免内存占用过大。

### 3.3 BilibiliClient API 客户端

**文件**：[bilibiliclient/client.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/client.ts)

采用**组合模式**设计：主类 `BilibiliClient` 通过 `Object.assign` 将各功能模块的方法合并到原型上。

各子模块职责：

| 模块 | 文件 | 功能 |
|------|------|------|
| 登录 | [account/login.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/account/login.ts) | 二维码登录、Cookie 登录、登出 |
| 账号数据 | [account/accountData.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/account/accountData.ts) | 获取用户信息、状态 |
| 请求封装 | [api/request.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/api/request.ts) | getRequest / postRequest，自动携带 Cookie |
| 视频 | [video/video.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/video/video.ts) | 视频详情、播放地址、推荐、雪碧图（自动降画质）、字幕列表（player/v2 + 四层防御）、字幕内容（HTTP） |
| 视频操作 | [video/action.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/video/action.ts) | 点赞、投币、收藏、稍后再看 |
| 专栏 | [article/article.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/article/article.ts) | 专栏列表、详情 |
| 评论 | [comment/comment.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/comment/comment.ts) | 评论列表、发布评论、回复 |
| 用户 | [user/user.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/user/user.ts) | 用户空间信息、关注/取关 |
| 收藏夹 | [folder/favfolder.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/folder/favfolder.ts) | 收藏夹列表、收藏视频 |
| 历史 | [folder/history.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/folder/history.ts) | 历史记录 |
| 消息 | [message/message.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/message/message.ts) | 私信、@我、回复我、点赞 |
| 搜索 | [search/search.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/search/search.ts) | 搜索视频、用户、专栏 |
| 动态 | [dynamic/dynamic.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/dynamic/dynamic.ts) | 动态列表、详情 |

**请求机制**：
- 所有请求通过 `fetch` API 发送
- `getRequest` 返回 `response.data`（Vela fetch 返回的最外层，结构：`{code:200, data:{B站返回}}`）
- `getRequest` / `postRequest` 自动添加 Cookie（sessdata、bili_jct、buvid 等）
- POST 请求时，`message` 等含中文/特殊字符的参数需用 `encodeURIComponent()` 编码
- 跨域访问 B 站静态资源（如字幕）需添加 `Referer` 请求头

**雪碧图自动降画质**（`getVideoFramesByAID`）：
- 先按原图尺寸 `img_x × img_cols × img_y × img_rows × 4` 估算解码内存
- 如果 > 9MB（LVGL 解码上限 10MB，留安全余量），按比例缩放
- 给每张图片 URL 添加 B 站 CDN 处理参数 `@{newWidth}w.jpg`（B站官方支持的按宽度等比缩放）
- 同步调整 `img_x` / `img_y`，保持 `img_cols` / `img_rows` 不变

**字幕获取机制**（双源回退 → 已简化为仅方案B）：
- **方案B（唯一）**：`https://api.bilibili.com/x/player/v2?cid={cid}&bvid={bvid}`
  - 登录态下 `need_login_subtitle=false`，返回完整 `subtitle_url`
  - 未登录或 URL 为空的条目在返回前自动过滤
  - 从 `response.data.data`（双层嵌套后）取 `subtitle.subtitles`
- **字幕内容**：`getVideoSubtitleContent` 将 `//` 前缀补为 `http:` 协议（B站字幕服务器仅允许 http，https 会失败），携带 `Referer: https://www.bilibili.com/video/{bvid}` 请求头

### 3.4 缓存内容管理 SavedContentManager

**文件**：[savedcontent.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/savedcontent.ts)

管理本地缓存的专栏文章、视频音频、视频雪碧图，使用文件系统存储。

**数据结构**：
- 索引文件：`internal://files/bilisavedcontent/index.json`
- 内容文件：`internal://files/bilisavedcontent/{id}.txt`

**核心方法**：
- `initialize()` - 从本地加载索引
- `storeContent(title, data, type)` - 保存文本内容（专栏）
- `storeVideoAudio(...)` - 保存视频音频引用
- `storeVideoSprite(title, spriteJson, bvid)` - 保存视频雪碧图（frameData+frameCount 序列化为 JSON 字符串）
- `getContent(id)` - 读取内容
- `deleteContent(id)` - 删除内容
- `listAllContent()` - 列出所有缓存
- `clearAll()` - 清空所有缓存
- `checkVideoAudioExists(bvid)` - 检查音频是否已缓存
- `checkVideoSpriteExists(bvid)` - 检查雪碧图是否已缓存

**分P缓存区分**：
- 多P视频不同分P的音频/雪碧图缓存 key 不同：`bvid + _p{pageNum}`（如 `BV1xxx_p2`）
- 详情页选择分P后，将 `pageNum` 透传到视频内容页，内容页据此构造 `cacheKeySuffix`

### 3.5 HTML 解析与渲染

**文件**：
- [htmlparser.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/htmlparser.ts) - HTML 解析器
- [articletools.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/articletools.ts) - 专栏工具
- [components/HtmlRenderer/HtmlRenderer.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/components/HtmlRenderer/HtmlRenderer.ux) - HTML 渲染组件

**专栏内容解析流程**：
1. 调用 B 站专栏 API 获取文章数据
2. 新版 API 返回 `detail.modules` 结构（paragraphs 数组），包含 text 对象（nodes 数组存富文本）
3. `convertTextNodesToInlineHtml()` 将 nodes 数组转为 HTML 字符串
4. `parseArticlePageHtml()` 解析 HTML 为渲染节点树
5. `HtmlRenderer` 组件递归渲染节点树

**图片处理**：
- 在线模式：正常显示图片
- 离线模式：将图片替换为文字提示 "[图片]（离线模式，暂不显示图片）"
- 通过 `network` API 检测网络状态切换

### 3.6 设置管理

**文件**：[settings.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/settings.ts)

持久化用户设置，存储在 system.storage 中。

**设置项**：
- `fresh_type` - 视频推荐类型
- `home_vid_count` - 首页视频数量
- `article_split_dom_count` - 专栏分块数
- `enableFullAnimation` - 动画档位（字符串枚举：`"关闭"` / `"开启"` / `"完整"`）
  - `"关闭"`：禁用所有动画（包括页面切换）
  - `"开启"`：仅启用页面切换动画
  - `"完整"`：启用全部动画（页面切换 + 加载序列帧等）
- `enableCommentImages` - 评论区图片显示开关
- `startupPage` - 启动页
- `pinnedDMUsers` - 置顶私信用户
- `enableUserTracker` - 用户行为追踪

### 3.7 通用工具 tools.ts

**文件**：[tools.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/tools.ts)

封装了通用工具函数：
- `formatNumber(num)` - 数字格式化（k/w 单位，如 1.2w、3.5k）
- `getCurrentTime()` - 获取当前时间字符串（HH:MM）
- `getDeviceInformation()` - 获取设备信息（Promise 化）
- `getDeviceSerial()` - 获取设备序列号（需特殊权限，模拟器不支持）
- `getNetworkType()` - 获取网络类型（Promise 化）
- `unicodeToString()` - Unicode 转字符串

> ⚠️ 注意：`getDeviceSerial()` 失败时不要触发页面跳转，用 try-catch 包裹并给默认值。

### 3.8 动画引擎

**文件**：
- [animation/engine.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/animation/engine.ts) - 动画引擎核心
- [animation/defaults.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/animation/defaults.ts) - 默认动画注册
- [animation/defaults/loading.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/animation/defaults/loading.ts) - 加载动画
- [animation/defaults/page.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/animation/defaults/page.ts) - 页面切换动画

自定义动画引擎，支持：
- 序列帧动画（加载、登录等，使用 seqanims 目录下的序列图片）
- 页面切换动画（淡入淡出、滑动等）
- 通过 CSS 类名控制动画播放
- 动画事件回调

**三档动画控制**（对应 `enableFullAnimation` 设置）：
- `ui.ts` 中 `InitPage` / 页面切换：仅 `"关闭"` 时跳过页面过渡动画
- `loading.ts` 中加载序列帧：仅 `"完整"` 时启用加载动画
- 全局 `.scroll-withanim` 类：仅完整模式下添加，启用滚动容器的动画效果

### 3.9 UI 引擎

**文件**：[ui/ui.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/ui/ui.ts)

自定义的页面管理引擎，是整个应用的页面调度核心，实现了：
- **虚拟页面池**：复用页面 VM 实例，避免频繁创建销毁，提升切换性能
- **页面栈管理**：维护页面跳转历史，支持前进/后退
- **VmPoolGC 回收机制**：自动回收长时间未使用的页面实例，释放内存
- **三档动画适配**：在页面初始化和切换时根据设置注入动画相关 CSS 类
- 解决 Vela 原生页面切换的性能问题和限制

应用入口 `app.ux` 中调用 `global.ui.Init()` 初始化。

### 3.10 异步 API 封装

**文件**：
- [asyncapi/file.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/asyncapi/file.ts) - 文件操作异步封装
- [asyncapi/storage.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/asyncapi/storage.ts) - 存储操作异步封装

将 Vela 原生的 callback 风格 API 封装为 Promise 风格，便于 async/await 使用：
- `asyncFile.readText()` / `asyncFile.writeText()` - 文件读写
- `asyncFile.access()` - 文件存在性检查
- `asyncFile.list()` - 列出目录
- `asyncFile.delete()` - 删除文件
- `asyncStorage.get()` / `asyncStorage.set()` - 键值存储

### 3.11 其他核心工具文件

| 文件 | 作用 |
|------|------|
| [buildinfo.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/buildinfo.ts) | 构建信息（自动生成）：版本号、编译日期、DESIGN_WIDTH 等。由 `quickapp.config.js` 在构建时生成。 |
| [bgimg.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bgimg.ts) | 背景图管理，根据用户设置切换不同主题的页面背景。 |
| [usertracker.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/usertracker.ts) | 用户行为追踪，记录页面浏览等统计数据（可在设置中关闭）。 |
| [jumpcheck.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/jumpcheck.ts) | 跳转检查，页面跳转前的校验逻辑（如登录状态检查等）。 |
| [funnytips.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/funnytips.ts) | 趣味提示文案，用于加载页等场景的随机提示。 |
| [eula.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/eula.ts) | 用户协议和隐私政策的文本内容。 |
| [tsimports.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/tsimports.ts) | TypeScript 模块导入统一入口，集中导入 Vela 系统模块。 |
| [logger/logger.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/logger/logger.ts) | 日志模块，提供 `global.logger.log()` / `error()` / `warn()` 方法。 |

### 3.12 Interconnect 跨设备通信模块（Ring 系列手环专用）

**文件**：
- [interconnect/interconnect.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/interconnect/interconnect.ts) - 通信引擎核心
- [interconnect/messageTypes.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/interconnect/messageTypes.ts) - 消息类型常量

Ring 系列（band9）等手环设备**无原生 fetch/request 网络能力**，所有网络请求需通过 Interconnect 发送给 Android 侧的同步 App，由手机代为请求后回传响应。

**核心功能**：
- **连接状态机**：`DISCONNECTED → CONNECTING → CONNECTED → ERROR`，状态变化触发回调
- **心跳保活**：每 15s 发送 `PING`，手机回 `PONG`，连续 3 次无响应判定断连
- **消息发送/响应**：每条消息带唯一 `messageId`，手机响应携带相同 `messageId` 做匹配
- **超时处理**：默认 30s 超时，超时 reject Promise，并自动重试 1 次

**消息类型（messageTypes.ts）**：
| 类型 | 方向 | 说明 |
|------|------|------|
| `PING` | 手环→手机 | 心跳包，手机应立即回 PONG |
| `PONG` | 手机→手环 | 心跳响应 |
| `FETCH_REQUEST` | 手环→手机 | 代发网络请求：{url, method, headers, body} |
| `FETCH_RESPONSE` | 手机→手环 | 响应回传：{messageId, ok, status, headers, body, jsonData} |
| `ERROR` | 双向 | 错误通知：{code, message} |

> 手表版平台原生支持 fetch，不加载该模块；手环版在 app.ux onCreate 中判断 deviceType 后按需初始化 `global.interconnect`。

### 3.13 FetchProxy 网络请求代理模块（Ring 系列手环专用）

**文件**：[fetchproxy/fetchProxy.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/fetchproxy/fetchProxy.ts)

封装手环侧的「伪 fetch」，接口签名与 Vela 原生 `fetch.fetch()` 完全兼容，上层 BilibiliClient 无需区分设备即可调用。

**调用流程**：
1. `fetchProxy.fetch({url, method, headers, data})`
2. 内部构造 `FETCH_REQUEST` 消息，通过 `global.interconnect.send(message)` 发送
3. 等待匹配 `messageId` 的 `FETCH_RESPONSE` 或超时
4. 自动将响应 body 尝试 JSON.parse，结构模拟 Vela fetch：`{code:200, data:{ B站返回 }}`（外层包 200，以便 getRequest 统一处理）

**使用方法**：
```typescript
// app.ux 初始化时判断设备类型
if (deviceType === 'band9') {
  global.fetchProxy = FetchProxy.create(global.interconnect)
  // 将 BilibiliClient 的底层 getRequest 注入为 fetchProxy 版本
  global.biliClient.overrideRequestImpl(global.fetchProxy.getRequest, global.fetchProxy.postRequest)
}
```

> 这样 BilibiliClient 所有上层 API（getVideoInfoByBVID、getVideoFramesByAID、getVideoSubtitleList 等）无需任何改动，即可在手表和手环两端运行。

---

## 四、各页面功能与实现

### 4.1 入口页面组

| 页面 | 路径 | 功能 |
|------|------|------|
| 启动页 | `pages/app/entry/splash` | 应用启动动画，加载资源 |
| 准备页 | `pages/app/entry/prepage` | 初始化后跳转的过渡页 |
| 登录页 | `pages/app/entry/login` | 二维码登录 |
| 引导页 | `pages/app/entry/introduction` | 首次使用引导 |
| 协议页 | `pages/app/entry/eularead` | 用户协议阅读 |

### 4.2 主功能页

**首页** `pages/app/features/main`
- 视频推荐列表
- 下拉刷新
- 视频卡片展示（封面、标题、UP主、播放量）
- 点击进入视频详情

**我的页面** `pages/app/features/mypage`
- 用户头像、昵称、等级
- 收藏夹、历史记录、稍后再看入口
- 消息入口

**区域列表页** `pages/app/arealist`
- 底部导航栏（首页、我的、缓存、设置、更新）
- 作为各功能模块的容器

### 4.3 视频相关

**视频详情页** `pages/video/videodetail`
- 视频标题、UP主信息、发布日期、播放量
- 工具栏（横向可滚动）：视频内容、点赞、投币、收藏、视频详情、章节（如有）、稍后再看
- **分P选择**：
  - `hasPages` 判断（pages.length > 1）后显示分P区域
  - 标题显示「分P · 共N集 · 当前第M集」
  - 纵向滚动容器（必须显式 `flex-direction: column`，Vela scroll 容器方向可能默认异常）
  - 每个分P条目：P编号 + 标题 + 时长，选中项高亮
  - 切换分P：更新 `currentCid`、`currentPageNum`、`currentPart`、`currentPageIndex`，并透传到下游页面
- **章节入口**：`view_points` 非空时显示「章节」按钮，点击进入 chapters 页
- 评论入口、发送评论按钮

**视频内容页** `pages/video/videocontent`
整合三大功能块，每个块独立显示缓存状态：

1. **雪碧图查看**：
   - **帧数选择（index 参数）**：未缓存时显示选择器，对应 `x/player/videoshot?index=N` 的 `index` 查询参数
     | 选项 | index 值 | 大约总帧数 | 单帧尺寸（典型 1080p 视频） | 适用场景 |
     |------|---------|-----------|--------------------------|---------|
     | 较少（清晰） | `index=1` | ~100 张 | 单帧 ~480×270，10×10 网格 = 4800×2700（需降质） | 画质敏感，逐帧细看 |
     | 中等（均衡） | `index=2` | ~50 张 | 单帧更大，网格更小 | 默认推荐 |
     | 较多（粗略） | `index=3` 或更大 | ~20~30 张 | 单帧超大，适合快速浏览 | 只想看大概剧情 |
     - 注意：`index` 越大，总帧数越少、单帧越大；具体数值由 B 站服务端决定，不是线性关系
   - 下载按钮：调用 `getVideoFramesByAID`（自动降画质）→ 逐张下载图片到本地 → `storeVideoSprite` 缓存
   - 已缓存时：「查看」按钮跳 spriteviewer，「删除」按钮清缓存
   - 下载失败重试：最多重试 3 次（接口 + 图片下载分别重试）；4G 网络下静态资源偶发失败，重试能显著提升成功率

2. **音频播放**：
   - 优先使用选中分P的 `cid`（`getVideoBestAudioUrlByCid`），fallback 到默认P1的 BVID
   - 本地缓存音频文件，已缓存后「播放」跳 player，「删除」清缓存

3. **字幕查看入口**：
   - 点击后跳转到 subtitleviewer，携带 `bvid`、`cid`、`title`
   - 由字幕页自行拉取字幕列表和内容

**雪碧图查看页** `pages/video/spriteviewer`
- 从缓存 ID 读取 `{frameData, frameCount}` JSON
- 先根据 `img_x × img_cols × img_y × img_rows × 4` 估算解码内存
- **> 10MB 安全阈值（LVGL 解码器限制）** 时：不渲染 image 组件，显示红色提示「原图过大(W×H)，手表内存不足无法解码」，避免系统级 OOM 崩溃
- 正常尺寸时：
  - 默认缩放容器 390×390，overflow:hidden
  - 图片默认缩到 150px 宽（CSS width/height 直接控制，不用 transform:scale 减内存）
  - 缩放控制：- 按钮（zoomOut）、中间显示当前倍率（zoomReset 1x~4x）、+ 按钮（zoomIn）
  - **倍率上限 4x 的计算依据**：
    - LVGL 解码上限 ~2.6M 像素 = 10MB / 4Bpp
    - 默认 1x 宽度：150px → 高度按雪碧图原始比例等比缩放（如 150×84.375 对 16:9）
    - 4x 后宽度：600px → 若为 16:9 则高度 337.5px → 总像素 ≈ 600×337 = 20.2 万像素（远低于 2.6M 上限，留足安全余量）
    - 若用户下载的是 9MB 降质后的 2000×1125 图，CSS 缩放到 600px 宽不影响解码内存（解码内存由下载的 jpg 文件实际像素决定）；4x 是「显示缩放」上限，不是解码像素上限
  - 左右 @swipe 平移图片（使用 position: absolute + left/top 调整，不用 transform: translate 减内存）
  - 每次缩放/平移后自动 clamp left/top，不允许拖出可视区域边界
  - 不支持上下滑动切换多图（单视频雪碧图一般 1 张，切换没必要；删除避免与手势冲突）

**字幕查看页** `pages/video/subtitleviewer`
- 未传入 cid 时先用 `getVideoInfoByBVID` 查找默认 cid（pages[0].cid 或 info.cid）
- 调用 `getVideoSubtitleList` 拿方案B的字幕列表
- 顶部横向滚动语言选择按钮（仅 `subtitle_url` 非空的条目才显示按钮），选中项高亮
- 默认自动选中第一个有效语言
- 选中语言后调用 `getVideoSubtitleContent` 拉字幕 JSON
- 解析后显示字幕条目列表：每一条显示「起止时间范围 + 字幕内容」，最多 4 行
- **调试日志规范**（关键路径必须打日志，否则手表端出问题无法回溯）：
  1. `getVideoSubtitleList` 调用前：打印完整 URL（含 cid、bvid 参数）
  2. `getVideoSubtitleList` 返回后：打印 response.data.data 的 `subtitle.subtitles.length` 和每个条目的 `{lan, lan_doc, subtitle_url是否为空}`
  3. 若返回 `need_login_subtitle: true`：warn 日志记录「未登录导致字幕列表为空」，UI 上提示「当前视频需登录才能查看字幕」
  4. `getVideoSubtitleContent` 调用前：打印最终请求的字幕 URL（确认是 http 协议、Referer 头是否携带）
  5. 字幕内容拉取失败：打印 HTTP status + 原始响应片段前 500 字节
- **加载失败排查步骤（文档内嵌）**：若用户反馈字幕无法加载，按顺序检查：
  1. 是否已登录（未登录时 player/v2 常返回 need_login_subtitle=true）
  2. URL 协议是 http 还是 https（必须 http）
  3. Referer 头是否正确设置为 `https://www.bilibili.com/video/{bvid}`
  4. 字幕服务器是否临时 403（偶尔，等几分钟重试）

**章节列表页** `pages/video/chapters`
- 从详情页 `view_points` 传入序列化后的章节 JSON
- 列表显示：章节名 + 时间戳
- 点击某章节后：跳转到 player，并携带 `startTime` 参数，播放器打开后从该时间点开始播放

**音频播放器** `pages/video/player`
- 音频播放（手表端不支持视频画面，仅播放音频轨道）
- 播放控制（播放/暂停、上一个/下一个、进度条拖动）
- 播放模式（顺序播放、单曲循环、随机播放）
- 音量调节
- 播放列表管理
- **字幕同步**（如有字幕）：复用歌词显示机制，根据当前播放时间高亮对应的字幕条目
- **章节跳转**：提供章节按钮，点击进入 chapters 页后可跳回指定时间点

### 4.4 评论相关

**评论列表页** `pages/reply/replys`
- 评论列表（分页加载，每页评论容器统一高度 250px）
- 每条评论：头像、昵称、时间、内容、点赞数
- 评论图片缩略图（70x70px，单张预览 + "共N张图"文字提示）
- 点击缩略图跳转到图片画廊页面查看全图
- 缩略图采用纵向布局，不与"回复"按钮重叠
- 回复按钮（点击调出全屏输入框回复）
- 点赞功能（点赞/取消点赞，图标状态切换）
- 评论图片显示受性能设置中 `enableCommentImages` 开关控制
- 长按评论调出操作菜单

**评论工具页** `pages/reply/replytools`
- 评论详情操作菜单（底部弹出式）
- 查看详情、查看回复、点赞等操作

> ⚠️ 重要：发布评论/回复时，`message` 参数必须用 `encodeURIComponent()` 编码，否则中文和特殊字符（如 &、=、? 等）会导致 B 站 API 返回错误。

**评论区图片实现细节**：
1. 性能设置 `enableCommentImages` 为总开关（默认关闭，节省内存）
2. 每条评论取第一张图片做 70x70px 缩略图
3. 多图时在缩略图右下角显示 "共N张图" 文字
4. 点击缩略图跳转到 `pages/tools/imagegallery` 图片画廊查看全部图片
5. 缩略图容器与回复按钮纵向排列，避免遮挡

### 4.5 专栏相关

**专栏展示页** `pages/article/articleshow`
- 文章标题、作者、发布时间
- 正文渲染（HtmlRenderer 组件递归渲染节点树）
- 支持文字和图片混排
- 在线/离线图片适配（在线显示图片，离线显示文字提示 "[图片]（离线模式，暂不显示图片）"）
- 分页阅读（因 DOM 数量限制，长文章分多页渲染）
- 可缓存到本地

**专栏缓存页** `pages/article/articlesave`
- 缓存保存进度显示
- 保存成功/失败提示

**专栏数据结构适配**：
B 站专栏 API 经历过一次大的结构变更，项目中做了兼容处理：
- **旧版结构**：`readInfo.content`（HTML 字符串）
- **新版结构**：`detail.modules`（paragraphs 数组，每个 paragraph 的 text 对象包含 nodes 数组存储富文本内容）
- `convertTextNodesToInlineHtml()` 函数将 nodes 数组转换为 HTML 字符串
- `parseArticlePageHtml()` 函数解析 HTML 为渲染节点树
- 最终由 `HtmlRenderer` 组件递归渲染

### 4.6 搜索相关

**搜索页** `pages/search/search`
- 搜索输入
- 热搜展示

**搜索结果页** `pages/search/searchresult`
- 综合 / 视频 / 用户 / 专栏 分类
- 分页加载

### 4.7 用户空间

**用户页** `pages/user/user.ux`
- 用户头像、昵称、等级、签名
- 关注数 / 粉丝数
- **关注按钮**：
  - 未关注状态：样式同视频详情页"发送评论"按钮（醒目填充样式）
  - 已关注状态：样式同"发送私信"按钮（描边样式）
  - 点击切换关注状态，调用 B 站关注/取关 API
  - **关注状态检测**：需同时判断 `attribute === 1`（已关注）和 `attribute === 2`（特别关注/互相关注特殊标记），点击前先重新拉取一次状态，处理错误码 22013（重复关注）
- 动态、视频 Tab 切换
- 发送私信入口
- 投稿视频列表预览

**用户动态页** `pages/user/userdynamic`
- 用户发布的动态列表

**用户视频页** `pages/user/uservideos`
- 用户投稿视频列表

### 4.8 收藏与历史

**收藏夹页** `pages/folders/favfolders`
- 收藏夹列表
- 点击进入夹内视频

**夹内视频页** `pages/folders/favfolders/foldervideos`
- 收藏夹内视频列表
- 分页加载

**历史记录页** `pages/folders/history`
- 观看历史列表

### 4.9 消息相关

**消息页** `pages/message/messages`
- 消息分类：@我、回复我、点赞我、私信
- 未读提示

**私信列表页** `pages/message/dmlist`
- 私信会话列表
- 置顶用户

**私信详情页** `pages/message/dmpage`
- 私信聊天界面
- 发送消息

### 4.10 设置相关

**设置主页** `pages/app/features/settings`
- 性能设置入口
- 清除缓存入口
- 关于应用、捐赠入口
- 退出登录
- UI 元素固定顺序：性能设置 → 存储信息 → 清除缓存 → 退出登录

**性能设置页** `pages/app/features/settings/performance`
- 视频推荐相关性
- 首页视频推荐数
- **动画档位**（单选按钮组）：
  - 关闭：所有动画禁用
  - 开启（默认）：仅页面切换动画
  - 完整：全部动画（加载序列帧 + 页面切换）
- 评论区图片显示开关
- 启动页选择

**清除缓存页** `pages/app/features/settings/cleartmp`
- 缓存类别选择（临时图片、日志文件、缓存内容、视频音频、其它）
- 各类别大小统计
- 一键清除
- 通过 `asyncFile` 模块扫描和删除文件

**关于页面** `pages/app/features/settings/about`
- 应用名称、版本号
- 开源软件声明入口
- AppBar 使用**直接子元素**（logo、应用名、版本号）纵向排列
  - 不能使用嵌套 flex 容器，Vela 对深层嵌套 flex 支持差会导致文字不渲染
- 第一行 logo + 应用名，第二行版本号，分两行显示避免小屏截断

**捐赠页** `pages/app/features/settings/donation`
- 捐赠信息展示

**开源软件声明** `pages/app/features/settings/opensoftware`
- 第三方开源组件说明

**检查更新页** `pages/app/features/settings/checkupdates`
- 版本检查
- 从 Gitee 获取最新版本号

### 4.11 工具页面

**图片画廊** `pages/tools/imagegallery`
- 多图浏览
- 左右滑动切换
- 用于评论图片全屏查看

**图片详情** `pages/tools/picturedetail`
- 单张图片大图查看

**文字详情** `pages/tools/textdetail`
- 长文本详情查看

### 4.12 错误页面

| 页面 | 用途 |
|------|------|
| `pages/error/networkerror` | 网络错误提示 |
| `pages/error/permissionerror` | 权限错误提示 |
| `pages/error/screenwidtherror` | 屏幕宽度不兼容提示 |
| `pages/error/sessionood` | 登录失效提示 |

### 4.13 手环版（Ring 系列 / band9）精简页面列表

手环设备（192px 设计宽度，内存和 CPU 显著低于手表）构建时必须移除以下页面与功能，仅保留核心使用场景，保证流畅：

| 模块 | 保留的页面 | 移除的页面与功能 |
|------|----------|----------------|
| 入口页 | splash、prepage、login、introduction、eularead | 无 |
| 主功能 | arealist（底部导航）、main（推荐列表）、mypage（我的）、settings（性能设置、清除缓存、关于、捐赠、开源声明、检查更新）、savedcontent、watchlater | 移除动态页 dynamic/detail（节省 DOM 池） |
| 视频相关 | videodetail（简化版：无章节入口按钮）、videocontent（仅保留雪碧图下载/查看、字幕查看入口；移除音频下载/播放）、spriteviewer、subtitleviewer | **必须移除**：player（音频播放器，手环无音频输出）、chapters（章节跳转依赖播放器） |
| 专栏相关 | 无 | **全部移除**：articleshow、articlesave（手环屏 192px 不适合阅读） |
| 评论相关 | replys（简化版：关闭评论图片显示、无回复输入框） | 移除 replytools（操作菜单）、移除评论图片（省内存） |
| 搜索、用户、收藏夹、历史、消息 | search、searchresult、user、favfolders、foldervideos、history、messages、dmlist、dmpage | 功能保留但单页列表数量减半（减少 DOM 数量） |
| 工具页 | imagegallery、picturedetail、textdetail | 简化版：不支持高分辨率图片 |
| 错误页 | 全部保留 | 无 |

> 注：manifest 路由表也需同步移除对应的页面条目，否则 RPK 体积偏大且 VM 池占用多。构建时可通过条件编译或两套 manifest.json（watch版 vs band9版） 实现。

---

## 五、公共组件

| 组件 | 路径 | 功能 |
|------|------|------|
| TitleBar | `components/TitleBar/` | 页面顶部标题栏 |
| DefaultButton | `components/DefaultButton/` | 标准按钮组件 |
| HtmlRenderer | `components/HtmlRenderer/` | HTML 递归渲染 |
| BetterOnlineImage | `components/BetterOnlineImage/` | 优化的在线图片（加载状态、错误占位） |
| FloatingPageChanger | `components/FloatingPageChanger/` | 浮动页码切换器 |
| FloatingSendBox | `components/FloatingSendBox/` | 浮动发送框 |
| FullScreenInput | `components/FullScreenInput/` | 全屏输入 |
| InputMethod | `components/InputMethod/` | 内置输入法（手表端） |
| Article | `components/Article/` | 文章展示组件 |
| DynShow | `components/DynShow/` | 动态展示组件 |
| RichText | `components/RichText/` | 富文本组件 |

---

## 六、关键技术实现细节

### 6.1 Vela 页面生命周期

```
onInit()  →  页面初始化（数据准备）
onShow()  →  页面显示（触发 UI 更新，注意：onInit 中赋值可能不触发 UI 刷新）
onHide()  →  页面隐藏
onDestroy() → 页面销毁
```

> 重要经验：在 Vela 中，某些 API 调用或数据赋值放在 `onInit` 中可能因 VM 未完全初始化而不触发 UI 更新。建议在 `onShow` 中执行需要更新 UI 的操作，或使用 `setTimeout` 延迟赋值。

### 6.2 设备存储 API

使用 `@system.device` 模块的两个接口：
- `device.getTotalStorage()` - 获取总存储空间
- `device.getAvailableStorage()` - 获取可用存储空间

返回值格式：`{ totalStorage: "字节数" }`（字符串类型的数字）

> 注意：这两个 API 仅需 `system.device` feature 声明，**不需要** `hapjs.permission.DEVICE_INFO` 权限。而 `device.getSerial()` 需要该权限，且模拟器不支持。

### 6.3 样式限制

Vela QuickApp 的 CSS 支持有限，以下属性不支持：
- `rpx` 单位（用 `px` 代替）
- `calc()` 函数（用固定宽度或 flex 布局代替）
- `box-sizing` 属性
- 部分 flex 高级属性可能有限支持
- `transform: translate / scale` 部分场景可用但性能较差，大图片平移/缩放优先用 `position:absolute + left/top` 和直接改变 `width/height`

### 6.4 Scroll 容器布局方向

Vela 的 `scroll` 组件默认 flex 方向**不一定**符合预期（纵向滚动内容可能被横向挤压）。
任何纵向列表类的 scroll（分P列表、语言按钮容器等），必须显式声明：
```css
.scroll-container {
    flex-direction: column;
    align-items: center;
}
```
否则第一个 item 可能占满容器或后续 item 不显示。

### 6.5 JSC 字节码编译

构建时使用 `--enable-jsc` 参数生成 JSC 字节码以提升性能。

注意事项：
- 文件路径不能含中文字符，否则 JSC 编译报错
- 资源文件名需全部用 ASCII 字符

### 6.6 评论图片显示机制

1. 性能设置中 `enableCommentImages` 控制总开关
2. 每条评论的图片取第一张做 70x70px 缩略图
3. 多图时显示 "共N张图" 文字
4. 点击缩略图跳转到图片画廊页面查看全图
5. 缩略图不与"回复"按钮重叠（纵向布局）

### 6.7 国际化 (i18n)

通过 `$t("key.path")` 在模板中引用，中英文双语支持。

配置文件：
- `src/i18n/zh.json` - 中文
- `src/i18n/en.json` - 英文

> ⚠️ 新增页面的标题如果没加到 i18n 文件中，会出现「i18n：没有找到对应的key」警告，不影响功能但最好补齐。

### 6.8 Vela fetch 响应结构

Vela 平台 `fetch.fetch({...})` 的返回结构为**最外层包 200 状态码**：

```json
{
  "code": 200,
  "data": { 
    "code": 0,
    "message": "OK",
    "ttl": 1,
    "data": { "aid":..., "...B站真正返回的数据" }
  }
}
```

- `getRequest` 返回值 = `response.data` = 中间层（含 B站 code/message/data）
- 对「直接 API」（如 `getVideoInfoByBVID`）：真正数据在 `.data.data`
- 对 B站「非公开 API」（如 `getVideoSubtitleList` 的 player/v2）：也在 `response.data.data` 里取 `subtitle` 等字段
- 绝对不能直接在 `root.data` 上找 `subtitle`，它在嵌套的第二层！

### 6.9 LVGL 图片解码内存限制（手表端硬限制）

小米 Vela 手表端的 LVGL 图片缓存最大 10MB（10,485,760 字节）：
```
malloc_cb: data size (51840003) is larger than max size (10485760)
decode_jpeg_file: decoding error
```
- RGBA 解码每像素 4 字节 → **理论最大像素数 = 10MB / 4 = 2,621,440 像素 ≈ 1620×1620 方图**
- 实际编码使用 9MB 作为安全阈值（约 2,359,296 像素 ≈ 1536×1536），留 1MB 给 JPEG 解码工作内存
- **常见 B 站雪碧图场景计算**：
  | 视频清晰度 | 单帧尺寸 (img_x × img_y) | 网格 (cols×rows) | 整张雪碧图尺寸 | 解码内存 | 是否 OOM |
  |-----------|--------------------------|-----------------|--------------|---------|---------|
  | 1080p（index=1 默认） | 480 × 270 | 10 × 10 | 4800 × 2700 | 51.84 MB | ✅ **崩溃，必须降质** |
  | 1080p（index=2） | 960 × 540 | 5 × 5 | 4800 × 2700 | 51.84 MB | ✅ **崩溃** |
  | 720p（index=1） | 320 × 180 | 10 × 10 | 3200 × 1800 | 23.04 MB | ✅ **崩溃** |
  | **360p（index=1）** | **160 × 90** | **10 × 10** | **1600 × 900** | **5.76 MB** | ❌ 正常 |
  | 降质后 4K 原图 | 500 × N（按比例） | 10 × 10 | 2000 × 1125 | 9.00 MB | ❌ 刚好在阈值内 |
- **解决策略**：
  1. **提前拦截（spriteviewer 层）**：加载前先算解码内存，>10MB 时不渲染 `<image>`，只显示红色文字提示（防系统级崩溃重启）
  2. **CDN 降质（getVideoFramesByAID 层）**：从 B 站拿图片 URL 时加 `@{width}w.jpg` 参数，让 CDN 服务器在下发前缩放，控制解码内存 ≤ 9MB
  3. **CSS 缩小显示（仅 UI）**：Vela `<image>` 的 CSS `width/height` 只影响显示尺寸，**不影响解码内存**；即使显示成 150px 宽，原图仍按全分辨率解码。降质必须在下载/CDN 层处理

### 6.10 B 站字幕服务器协议限制与登录态

- B 站字幕/AI 字幕域名（`aisubtitle.hdslb.com`、`i0.hdslb.com` 等）对 **HTTPS 请求会拒绝/截断**或返回4xx，必须使用 **HTTP** 协议
- `//aisubtitle.hdslb.com/...xxx.json` → 补为 `http://aisubtitle.hdslb.com/...xxx.json`，不能补 `https:`
- 同时必须带 `Referer: https://www.bilibili.com/video/{bvid}` 请求头，否则返回 403
- **未登录态字幕限制**（`need_login_subtitle` 字段）：
  - `getVideoSubtitleList` 调用 `x/player/v2` 时，若用户未登录（sessdata 缺失），返回中会有 `need_login_subtitle: true`
  - 此时 `subtitle.subtitles` 可能**全部为空字符串**（条目 lan/lan_doc 存在，但 `subtitle_url` 全部是 `""`）
  - 处理方式：过滤掉 `subtitle_url === ""` 的条目；若全部被过滤，UI 提示「当前视频需登录后才能查看字幕」

### 6.11 字幕四层防御机制（解决 B 站 API 不稳定返回错误数据问题）

**问题现象**：B 站 `x/player/v2` API 在相同 bvid+cid 参数下，有时返回完整正确的字幕列表（如 6 条），有时只返回 1 条错误字幕（URL 不含 aid）。这是 B 站服务端的不稳定性，不是 Vela fetch 串台。

**四层防御实现**（`getVideoSubtitleList` + `getVideoSubtitles`）：

#### 第一层：内存缓存（10分钟有效）
- 使用 `global.subtitleListCache` 对象，key 为 `bvid_cid`
- 首次成功获取到**有效**字幕后写入缓存（必须通过 URL 校验）
- 10分钟内再次请求同一视频，直接返回缓存，不调用 B 站 API

#### 第二层：URL 严格校验 + 渐进式重试（最多8次）
- **重试次数**：8次（从 5 次提升）
- **渐进式延迟**：1.5s → 2s → 2.5s → 3s → 3.5s → 4s → 4.5s → 5s（每次递增 500ms）
- **响应结构校验**：
  - 验证 `response.data.data` 是否存在（双层嵌套）
  - 不存在则重试
- **URL 校验规则**：
  - 正确的 B 站字幕 URL 格式：`//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/{aid}{cid}{hash}.json`
  - **单条字幕 + URL 不含 aid** → 判定为错误数据，重试
  - **多条字幕 + 全部 URL 都不含 aid** → 判定为错误数据，重试
  - 通过校验后才更新缓存

#### 第三层：字幕内容校验（`getVideoSubtitles`）
加载字幕内容后进行两项检查：
- **条目数量检查**：
  - 短视频（<60秒）：至少 3 条字幕
  - 长视频（≥60秒）：至少 10 条字幕
  - 不满足则判定为错误数据，清除缓存后重新获取列表
- **首条时间戳检查**：
  - 首条字幕的 `from` 值应 ≤30 秒
  - 如果首条字幕开始时间 >30秒，可能是其他视频的字幕，判定为错误
- 内容校验失败最多重试 3 次，每次间隔 2 秒

#### 第四层：过期缓存兜底
- 重试开始前保留过期缓存的引用
- 如果所有校验和重试都失败，但存在过期缓存（即使超过 10 分钟），优先返回过期数据
- 避免完全无字幕可用的情况

**关键代码位置**：
- `bilibiliclient/video/video.ts` → `getVideoSubtitleList` 方法（第 66-207 行）
- `bilibiliclient/video/video.ts` → `getVideoSubtitles` 方法（第 244-316 行）

### 6.12 手环（Ring 系列）网络请求转发机制

Ring 系列（如 band9）**无原生 fetch / request 能力**，必须通过蓝牙 Interconnect 将请求转发给 Android 同步 App 执行：

```
手环 Vela App (band9)         Android 同步 App (手机)        B 站 API 服务器
       |                              |                            |
       |-- FETCH_REQUEST(GET,url) -->|                            |
       |                              |-- HTTP GET url, headers -->|
       |                              |<-- JSON response ----------|
       |<-- FETCH_RESPONSE(json) -----|                            |
```

关键实现点：
1. **消息 ID 匹配**：手环发送时生成 `messageId = Date.now() + Math.random()`，存入 pending Map；手机响应时携带相同 messageId 触发 resolve
2. **超时兜底**：30s 未收到响应 reject 掉 pending Promise，自动重试 1 次
3. **响应结构兼容**：FetchProxy 生成的响应必须与 Vela 原生 fetch 结构完全一致（`{code:200, data:{B站返回}}`），上层 `getRequest` 才能无感切
4. **连接状态监控**：Interconnect 暴露 `isConnected` / `on('connect'|'disconnect')`，断连时 UI 全局提示「请打开手机同步 App」

### 6.12 B 站 CDN 雪碧图缩放参数详解

B 站静态图片服务器（`i0.hdslb.com`、`i1.hdslb.com` 等）支持在 URL 后追加 `@参数` 进行实时图像处理，无需前端缩放：

| 参数格式 | 作用 | 示例 |
|---------|------|------|
| `@{W}w.jpg` | 按宽度 W 等比缩放，高度自动适配 | `@2000w.jpg` 将 4800×2700 缩到 2000×1125 |
| `@{H}h.jpg` | 按高度 H 等比缩放 | `@1125h.jpg` 同上 |
| `@{W}w_{H}h.jpg` | 固定宽高缩放（比例不一致时会裁剪，慎用） | - |
| `@{Q}q.jpg` | JPEG 质量 0~100，数字越小体积越小 | `@60q.jpg` 60% 质量 |
| `@.{format}` | 强制输出格式，如 webp/jpg/png | `@.webp` |

- 项目中 `getVideoFramesByAID` 使用 `@{newWidth}w.jpg`（仅按宽等比缩放，保证纵横比不变）
- **注意**：URL 中如果已经有 `@`（如用户上传图片自带参数），要先把 `@` 之后的内容去掉再追加，否则 CDN 不会生效
- 典型 4800×2700 → 2000×1125 缩放：解码内存从 51.84MB → 9MB，体积也同步缩小，下载更快、内存更低

---

## 七、开发经验与坑点总结

### 7.1 配置与构建

1. **组件名唯一性**：manifest.json 中 `router.pages` 的组件名必须唯一，重复会导致路由跳转失败（页面白屏/无响应）。

2. **中文路径问题**：资源文件名不能含中文字符，JSC 字节码编译会报错 `read_dir: stat ... failed`。需将所有含中文的文件名改为英文/ASCII。

3. **buildinfo.ts 生成注意**：由 `quickapp.config.js` 构建时自动生成的 `buildinfo.ts`，变量值必须正确加引号（如 `DESIGN_WIDTH = "device-width"`），缺引号会导致导入该文件的页面全部崩溃。

4. **PowerShell 执行策略**：Windows 上直接运行 `yarn` / `npx` 可能被执行策略阻止，可用 `node node_modules/aiot-toolkit/lib/bin.js build` 方式绕过。

5. **构建目录被占用**：`build/` 目录若被其他程序打开（如文件管理器），清理时可能报 EBUSY 错误，但一般不影响最终 RPK 生成。

6. **版本信息更新位置**：
   - `manifest.json` 的 `versionName`（显示版本）、`versionCode`（自增数字）
   - `bilibiliclient/client.ts` 顶部的版本字符串（日志打印用）
   - 需同时修改，不要只改一个

### 7.2 Vela 框架特有的坑

7. **onShow vs onInit**：需要更新 UI 的操作尽量放在 `onShow` 中执行。`onInit` 阶段页面 VM 未完全初始化，直接赋值可能不触发 UI 刷新。

8. **setTimeout 强制刷新**：Vela 响应式系统有时同步赋值不触发 UI 更新，可用 `setTimeout(() => { this.xxx = value }, 100)` 延迟到下一个事件循环赋值，强制触发视图更新。这是 Vela 开发中的常用技巧。

9. **Vela 不支持 rpx 单位**：所有样式统一使用 `px` 单位，不要使用小程序常见的 `rpx`。

10. **Vela 不支持 box-sizing**：从样式中移除 `box-sizing` 属性，改用 flex 布局和固定宽度控制元素大小。

11. **calc() 函数不支持**：CSS `calc()` 函数不受支持，用固定宽度（如 `width: 340px`）或 flex 布局代替。

12. **设备 API 回调同步执行**：Vela 模拟器中部分 device API 的 success 回调是**同步执行**的，此时 VM 可能还未准备好，直接赋值不触发 UI 更新。需要 `setTimeout(..., 100)` 延迟赋值。

13. **嵌套 flex 容器支持差**：关于页 AppBar、复杂的列表项等，如果使用了多层嵌套 `<div flex-direction>` 会导致文字块不渲染或挤压。关键容器尽量用**直接子元素**平铺，少套 flex。

14. **Scroll 内 flex-direction 必须显式声明**：分P列表、字幕语言选择容器等纵向列表的 scroll 组件，必须写 `flex-direction: column`，否则条目可能横向堆叠或第一条占满容器。

15. **image 组件远程 URL 不能直接加载**：Vela `<image>` 组件的 `src` 不支持直接远程 URL（如 `https://...jpg`）。必须先通过 `request.download` 下载到本地，再将返回的本地 URI（如 `internal://cache/xxx.jpg`）赋给 `src`。雪碧图、评论缩略图都是这个流程。

### 7.3 B 站 API 相关

16. **评论 message 必须编码**：POST 发布评论/回复时，`message` 参数必须用 `encodeURIComponent()` 编码，否则中文和特殊字符（`&`、`=`、`?` 等）会导致 B 站 API 签名校验失败，返回错误码。

17. **字幕/静态资源 Referer 头**：请求 B 站字幕 JSON 等静态资源时，必须携带 `Referer: https://www.bilibili.com/video/{bvid}` 和 `Origin: https://www.bilibili.com` 请求头，否则会返回 403 Forbidden。

18. **字幕 API 字段名**：B 站视频详情 v2 API 中，字幕列表字段是 `subtitles`（不是 `submissions`）。

19. **fetch 响应为双层嵌套**：Vela fetch 返回 `{code:200, data:{code:0, data:{B站数据}}}`，不能直接在 `response.data` 上找 B 站字段。绝大多数 API 的真正数据在 `response.data.data`。

20. **字幕获取双源回退策略**：
    - **方案A（已弃用）**：`x/web-interface/view` 的 `subtitle.list` — 登录后该字段 `subtitle_url` 仍为空（实测部分视频始终空），已从流程中移除。
    - **方案B（唯一使用）**：`x/player/v2?cid={cid}&bvid={bvid}` — 登录态（`login_mid` 存在、`need_login_subtitle=false`）下返回的 `subtitle.subtitles` 条目均带有效 `subtitle_url`。
    - 过滤规则：返回前先过滤掉 `subtitle_url` 为空的条目，避免字幕页生成无效语言按钮。

21. **字幕协议必须用 HTTP**：`aisubtitle.hdslb.com` 等 B 站字幕静态资源域名对 HTTPS 请求有限制（会重定向/失败），补协议前缀时务必补 `http:` 不要补 `https:`。

22. **专栏新数据结构**：B 站专栏 API 已从旧版 `readInfo.content`（HTML 字符串）改为新版 `detail.modules`（paragraphs 数组）。新版中每个 paragraph 的 `text` 是对象而非字符串，包含 `nodes` 数组存储富文本内容，需解析 nodes 生成 HTML。

23. **视频帧接口（雪碧图）参数**：`x/player/videoshot` 使用 `aid` 参数，不用 `cid`（用 cid 返回 -400 参数错误）。`index=1` 对应 100 张，`index` 值越大帧数越少、单帧越大。

24. **非公开 API 合规性**：`x/player/videoshot`、`x/player/v2` 等均为 B 站非公开 API。仅适合个人非商业低频使用；要避免高频率请求（会触发 -412 风控）。

### 7.4 设备与权限

25. **getDeviceSerial 失败处理**：`device.getSerial()` 需要 `hapjs.permission.DEVICE_INFO` 权限，且模拟器不支持。失败时**千万不要**执行 `router.clear()` + `router.replace()` 跳错误页，会导致应用初始化中断。用 try-catch 包裹，给默认空字符串即可。

26. **存储 API 独立检查**：`device.getTotalStorage()` 和 `device.getAvailableStorage()` 要独立设置成功/失败标志，用各自的 got 布尔值控制，一个失败不应影响另一个的显示。

27. **存储空间显示策略**：初始状态显示 "加载中"，API 返回后更新数值，失败时显示 "N/A"。单位自动换算：>= 1024MB 时显示 GB，否则显示 MB。

### 7.5 UI 与布局

28. **关于页面小屏适配**：关于页顶部的应用名+版本号，如果横向排列在小屏幕（如手表）上会显示不全。采用 column 纵向布局，应用名在上、版本号在下，确保完整显示。关键是 AppBar 不要使用嵌套 flex 容器，用直接子元素平铺即可。

29. **分P条目布局**：分P列表的 `.page-item` 必须用固定高度（如 70px），不要写 `flex:1` 或 `min-height:100%`，否则第一个条目会占满整个 scroll 容器导致其他分P看不到。同时需要 scroll 容器声明 `flex-direction: column`。

30. **评论容器统一高度**：评论列表分页加载时，每条评论的容器高度要统一（如 250px），否则翻页后最后一条评论高度不一致，视觉上有跳动感。

31. **评论图片不与回复重叠**：评论图片缩略图和回复按钮要纵向排列，不要放在同一行，避免图片遮挡回复按钮。

32. **评论缩略图尺寸**：70x70px 缩略图，多图时显示 "共N张图" 提示，点击缩略图进入图片画廊浏览全图。

33. **雪碧图不用 transform 操作**：大图片的缩放/平移如果用 `transform: scale() / translate()` 会额外占用显存，在手表上容易卡顿。改用：
    - 缩放：直接改 `<image>` 的 `width` / `height` 属性
    - 平移：`position: absolute` + `left` / `top` 数值调整

### 7.6 功能取舍与变更记录

34. **字幕功能已恢复并稳定实现**：之前因跨域 Referer / responseType / 协议 等问题一度删除。现重新实现，关键修复：
   - 只用 player/v2 接口拿字幕（不再走 view 接口的空 URL 条目）
   - 响应结构正确解析到第二层 `data.data`
   - 字幕内容强制用 HTTP 协议
   - 新增独立的 subtitleviewer 页面，与播放器的字幕同步显示逻辑并存

35. **存储容量显示已删除**：原计划在清除缓存页显示总/已用/可用存储空间。虽然使用 `setTimeout` 延迟赋值等手段尝试修复 UI 刷新问题，但 Vela 响应式系统在该场景下仍不稳定，最终删除该功能。

36. **帧播放功能已删除**：最初使用 CSS overflow 裁剪雪碧图单帧做播放控制（暂停、上一帧、进度条等），用户确认官方只有雪碧图单张整图后，功能删除，改为 spriteviewer 纯整图查看。

37. **雪碧图上下滑动切换删除**：spriteviewer 中最初的多图上下滑动切换功能已删除，单视频的雪碧图通常是一张（或数量很少），用按钮切换即可。

38. **音频播放器的字幕同步依赖登录**：播放器内置的字幕自动高亮显示，需要先通过 `getVideoSubtitles` 成功拉到字幕，未登录视频只能显示无字幕状态，不强制提示。

### 7.7 其他经验

39. **图片加载失败处理**：使用 `BetterOnlineImage` 组件，加载失败时显示默认占位图，不影响页面整体渲染。雪碧图单独页面用 `@error` 回调显示失败状态。

40. **专栏离线图片策略**：检测到离线时，将文章中的图片替换为文字提示 "[图片]（离线模式，暂不显示图片）"，避免空白占位。

41. **关注按钮样式切换**：用户空间页的关注按钮，未关注时使用填充样式（同发送评论按钮），已关注时使用描边样式（同发送私信按钮），状态切换时样式同步变化。

42. **日志输出规范**：统一使用 `global.logger.log()/error()/warn()` 输出日志，便于调试和问题定位。关键路径（API 请求 URL、响应结构片段）务必打日志，否则手表端出问题无法回溯。

43. **设置项默认值**：评论区图片显示 (`enableCommentImages`) 默认关闭，动画档位 (`enableFullAnimation`) 默认 `"开启"`（仅页面切换），以适配低性能手表设备。

44. **雪碧图下载重试**：从 B 站拉 `videoshot` 数据和下载 jpg 文件时都最多重试 3 次。4G 网络下 B 站静态资源偶发失败，重试 3 次能显著提升成功率。

45. **分P的 cid 全链路透传**：分P视频不同分P的 `cid` 不同，切换分P后所有下游（视频内容、音频播放器、字幕查看、缓存 key）都必须使用**当前分P的 cid**，不能回退到 `info.cid`（通常是 P1）。做法：
    - 详情页 `SelectPage()` 更新 `currentCid`
    - 传参给 `GoVideoContent()`，内容页拿到后放在 `this.cid`
    - 内容页用 `this.cid` 调用 `getVideoBestAudioUrlByCid` / 传给字幕页
    - 缓存 key 加 `_p{pageNum}` 后缀，避免不同分P的音频/雪碧图互相覆盖

### 7.8 手环（Ring 系列 / band9）适配专项

46. **手环无原生 fetch 能力**：Ring 系列（band9）等手环设备的 Vela runtime **没有 `@system.fetch` feature**，直接调用 fetch 会抛 feature_not_found 错误。必须通过蓝牙 Interconnect 将请求转发给 Android 同步 App 代为请求，不能指望手环自己上网。

47. **Interconnect 连接状态机必做**：手环与手机的蓝牙连接随时可能断开（手机杀后台、超出距离、省电模式等）。Interconnect 模块必须维护完整状态机 `DISCONNECTED → CONNECTING → CONNECTED → ERROR`，状态变化时回调给 UI 层弹提示，避免用户操作无响应。

48. **band9 manifest 配置三要素**：
    - `deviceTypeList: ["band9"]`（必须匹配设备型号，否则 AIOT 打包时会注入错误的 feature 声明）
    - `config.designWidth: "192px"`（固定 192，不能写 device-width，手环屏就是 192，写错会导致所有页面按更大屏缩放然后裁切）
    - 移除 `features` 中手环不支持的声明（如 `audio`、`video`、`hapjs.permission.DEVICE_INFO`），避免加载时 feature_not_found 崩溃

49. **手环 designWidth 192px 下所有样式需重新适配**：手表设计稿 390px 左右，手环缩小一半多。不要等比缩小所有字号到 8px（看不清），策略是：
    - 字号最小 12px（再小真看不见）
    - 列表每页只放 2~3 项，分页加载（手环翻页靠按钮或长滑）
    - 按钮最小触控区 56×56px（手指粗，点不到会被骂）
    - 移除冗余装饰，保留核心信息

50. **手环必须精简的功能清单（不要有侥幸心理）**：
    - 移除 player 音频播放器（手环无扬声器，就算有也不适合）
    - 移除 chapters 章节跳转（依赖播放器，移除后章节入口按钮也隐藏）
    - 移除所有专栏相关页面 articleshow、articlesave（192px 读文字是折磨）
    - 移除评论区图片显示（无论是否打开开关都强制关闭，省内存）
    - 移除加载序列帧动画（动画档位默认为「关闭」，序列帧解码太耗内存）

### 7.9 字幕与雪碧图调试专项

51. **字幕加载失败的标准排查步骤**：按顺序排查，别跳步，90% 问题都在前 3 步：
    1. **查登录态**：打印 `need_login_subtitle` 字段，true → 用户未登录，字幕条目不完整，提示用户登录
    2. **查协议**：打印最终请求的字幕 URL，确认是 `http://` 不是 `https://`（https 常被字幕服务器拒绝）
    3. **查 Referer**：确认请求头里带了 `Referer: https://www.bilibili.com/video/{bvid}`，没带 B 站直接回 403
    4. **查 URL 有效性**：将同一条 URL 复制到电脑浏览器（带同样 Referer）访问，看返回是正确 JSON 还是空
    5. **查响应解析**：player/v2 的字幕列表在 `response.data.data.subtitle.subtitles`（三层嵌套！），别漏 `.data.data`

52. **字幕调试日志必须打够**：字幕功能问题 90% 靠日志定位。没日志手表端就是黑盒。关键节点 5 条日志（6.10 字幕查看页有更细规范）：URL 发前、URL 回后、need_login_subtitle 状态、选语言后请求前、HTTP 失败响应体。

53. **雪碧图 CDN 缩放参数 @ 的位置易错**：B 站图片 URL 的 `@参数` 必须在文件名后缀之前、原路径之后，而且如果原 URL 已经带 `@`（部分用户图会有），必须**先把第一个 `@` 之后的内容全部删掉**再追加自己的参数。错误示例：正确 `xxx.jpg@2000w.jpg`；错误写法1（双参数）：`xxx.jpg@.webp@2000w.jpg`（CDN 不认）；错误写法2（位置错）：`xxx@2000w.jpg.jpg`。

54. **雪碧图降质后记得同步更新 img_x/img_y**：CDN 缩放了原图的像素尺寸，frameData 里的 `img_x`（单帧宽）和 `img_y`（单帧高）也必须按同样缩放比例乘 `ratio` 再取整。否则 spriteviewer 里单帧裁切计算会错位（把两帧各裁一半）。

55. **雪碧图下载失败重试 3 次分开做**：B 站静态资源 CDN 在 4G 网络下偶发 5xx/超时，不能只 retry 接口不 retry 图片。重试必须分两层：
    - 第一层：`getVideoFramesByAID` 拿元数据失败（接口失败），最多 retry 3 次
    - 第二层：图片 `request.download` 单张失败，最多 retry 3 次；一张失败不影响其他图
    - 全部重试后仍有失败：最后提示用户「部分图片下载失败，可在缓存管理中重试」

56. **字幕四层防御机制**：B 站 `x/player/v2` API 不稳定，同一 bvid+cid 可能返回错误字幕数据。解决方案：
    - 第一层：内存缓存（10分钟有效，只缓存通过校验的数据）
    - 第二层：URL 严格校验 + 渐进式重试（8次，延迟递增 500ms）
    - 第三层：字幕内容校验（条目数量 + 首条时间戳）
    - 第四层：过期缓存兜底
    - 详见 6.11 节

57. **播放器持续亮屏**：视频模式下使用 `@system.brightness.setKeepScreenOn({ keepScreenOn: true })` 保持屏幕常亮，防止听视频看字幕时自动息屏。需要在 `manifest.json` 中声明 `system.brightness` feature。退出播放器时调用 `setKeepScreenOn({ keepScreenOn: false })` 恢复正常息屏。

58. **性能设置中的字幕开关与同步延时**：
    - `enableVideoSubtitle`：听视频字幕开关（默认开启）
    - `subtitleSyncOffset`：字幕滚动同步延时（秒），范围 -2.0~2.0，默认 0.3s
    - 设置项定义在 `settings.ts`，UI 在 `pages/app/features/settings/performance/performance.ux`
    - 播放器加载字幕前检查开关状态，关闭时显示「字幕已关闭（可在设置中开启）」提示

### 7.10 字幕手动刷新与缓存策略

59. **字幕查看页手动刷新按钮**：在字幕列表的语言选择区上方提供了全宽刷新按钮"⟳ 刷新字幕列表"，功能逻辑：
   - 清除 `global.subtitleListCache` 缓存
   - 重置所有本地状态（清空列表、设置选中、页码等）
   - 提示"正在重新获取字幕列表..."后延迟 1.5s 重新调用 `loadSubtitleList()`
   - 延迟避免与上一个请求冲突（Vela fetch 全局单例）
   - 在上方同时显示"若字幕不正确请点击刷新再试"提示文字，字体与"选择语言"一致（20px、粗体、白色）

60. **字幕缓存策略最终简化**：经过多次迭代，字幕缓存最终简化为最稳定的方案：
   - **单次请求**：首次调用 `getVideoSubtitleList` 后立即保存结果，不做重试/校验
   - **立即保存**：无论返回数据正确与否，直接存入本地状态
   - **退出清除**：从视频详情页退出时（`onInit` 中）清除 `global.subtitleListCache`，下次进入重新获取
   - 放弃早期复杂的四层防御（内存缓存+8次重试+URL校验+内容校验+过期兜底）是因为 B 站 API 的不稳定是间歇性的，简化策略让每次进入都重新请求，反而避免了缓存错误数据长期生效的问题

61. **字幕刷新时的请求隔离**：为防止手动点击刷新时前序请求尚未完成导致串台：
   - 每次刷新生成新的 `currentRequestId = Date.now() + '_' + Math.random()`
   - 在字幕加载过程中检查 `currentRequestId` 是否匹配，不匹配则跳过回调处理
   - 确保只有最新的那次刷新请求的结果被应用到 UI

### 7.11 关于页开发致谢排列

62. **关于页致谢顺序**：关于页底部开发者致谢区域按贡献类型和重要性排列：
   - 上方为提供运行环境及 AI 辅助的团队（@TRAE、@豆包），放在"修改制作"标题下方
   - 中间为主要编辑和源码提供者（@干又cyper、@羊羽 Weslie），放在"主要编辑、源码提供"说明下方
   - 下方为其他贡献者（@B4QAQ 等）
   - 注意：致谢条目用独立 `<div class="developer">` 包裹，每个占一行，方便后续增删而不影响其他条目布局

### 7.12 跨平台 Git 提交注意事项

63. **PowerShell 下 Git 提交信息注意事项**：
   - Windows PowerShell **不支持** `cat <<'EOF'` heredoc 语法用于提交信息，会导致 `Missing file specification after redirection operator` 错误
   - 正确做法：先将提交信息写入文件，再用 `git commit -F 文件名` 提交
   - 注意：提交信息文件中含有 `&` 等特殊字符时不会报错（文件方式天然避开 PowerShell 特殊字符解析）
   - 使用 git add 时要显示指定文件路径（空格分隔多个文件），或使用 `git add .` 添加当前目录所有变更
   - 提交完成后删除 commit_msg.txt 避免误提交到仓库

64. **Git 分支管理经验**：
   - 多分支开发时（如 band9 功能分支 + next-gen 主分支），用 `git log` 对比分支差异后使用 `git cherry-pick` 移植提交
   - 如果 cherry-pick 提示 `empty`，说明该提交的变更已通过其他方式合并到目标分支，使用 `git cherry-pick --skip` 跳过
   - 推送前确认目标 remote：`git remote -v` 查看，用 `git push {remote} {branch}` 指定远程
   - 本地分支删除：`git branch -D 分支名`（-D 强制删除，即使未合并）
   - 网络不稳定时 git push 失败报 `Could not connect to server`，检查网络连通性后重试即可

### 7.13 近期功能开发记录（2026-07 下旬）

65. **雪碧图多张切换（修复"只能看到一张"）**：`spriteviewer` 原本只 `showSprite(0)` 显示第一张且无切换 UI。B 站 `videoshot` 接口可能返回多张雪碧图（下载日志可见"下载雪碧图 2/N"）。修复：
   - 滚动页模式：缩放按钮下方新增导航行「上一张 | 第X/共Y张 | 下一张」，仅当 `spriteImages.length > 1` 时显示
   - 全屏预览模式：顶部栏左右各加 ◀/▶ 切换按钮，底部显示当前页码
   - `prevSprite()/nextSprite()` 自动循环切换，切换时重置缩放与偏移

66. **字幕内容持久缓存（内存 + 本地文件）**：字幕 JSON 内容每次进入都重新请求网络，浪费流量且慢。实现三层缓存：
   - `SavedContentManager` 新增 `storeVideoSubtitle / getVideoSubtitleByBvidLang / checkVideoSubtitleExists`，按 **bvid+语言** 持久化到本地文件（`internal://files/bilisavedcontent/`）
   - `getVideoSubtitleContent(url, bvid, lan?)` 增加缓存链：**内存缓存(`global.subtitleContentCache`) → 本地文件缓存 → 网络请求**，成功后自动写入两层缓存
   - 字幕列表缓存（`global.subtitleListCache`）仍按 7.10 的策略由详情页退出时清除；字幕**内容**缓存独立持久，不随列表缓存清除，听视频/看字幕界面再次进入直接读缓存，不再请求网络
   - 调用方需传 `lan` 参数（`subtitleviewer.SelectLanguage` 传 `item.lan`，`getVideoSubtitles` 传 `target.lan`），缓存 key = `bvid_lan`

67. **听视频字幕延迟加载（左滑才加载）**：原逻辑进入播放器立即 `loadVideoSubtitles()`，不看字幕也白白请求。改为按需加载：
   - `playCurrentSong()` 只显示提示「左滑查看字幕」，不发请求
   - swiper 绑定 `@change="onSwiperChange"`：左滑到字幕页（新样式 index=2 / 旧样式 index=1）且字幕未加载过时才调用 `loadVideoSubtitles()`
   - 右滑回播放页不触发；已加载过的不重复加载

68. **字幕刷新按钮始终显示**：
   - player 字幕页状态栏：刷新按钮条件从 `videoMode && !subtitleLoading` 放宽为 `if="{{videoMode}}"`，**加载中也显示**，随时可刷新
   - subtitleviewer：把「⟳ 刷新字幕列表」按钮从「仅列表非空时显示」的区块中独立出来，`lang-section` 条件改为 `!loading`——**无字幕（列表为空）时也显示刷新按钮**，配合"该视频无字幕"提示可手动重试；有字幕时才显示语言选择

69. **视频内容页常亮 + 下载进度弹窗**（videocontent）：
   - 进入页面即 `brightness.setKeepScreenOn({ keepScreenOn: true })`，`onDestroy` 恢复，保证下载期间不熄屏
   - 新增居中下载进度弹窗：标题「正在下载」+ 进度文字 + 粉色进度条 + 「下载过程中请保持此界面」提示
   - 雪碧图下载：5%（获取数据）→ 10%~90%（逐张）→ 95%（保存）→ 100%（完成）
   - 音频下载：5%（获取地址）→ 15%（下载）→ 90%（保存）→ 100%（完成）
   - 所有失败/取消路径均关闭弹窗并 Toast 提示原因

70. **在手机上观看（QR 码页面）**：
   - 视频详情工具栏新增「在手机上观看」按钮，图标 `vidtool_watchonphone.png`，文字允许换行（`lines: 2`，按钮加宽到 100px）
   - 新增 `pages/video/watchonphone` 页面：使用 Vela 内置 **`<qrcode>` 组件**（与登录页同一组件）生成 `https://www.bilibili.com/video/{bvid}` 二维码，手机 B 站 App 扫码直接打开
   - 页面进入即 `brightness.setKeepScreenOn(true)` 保持常亮方便扫码，退出恢复；底部「退出」按钮返回
   - manifest.json 注册路由 `pages/video/watchonphone`

71. **搜索结果页禁用水平滑动（按钮切换）**：原 swiper 横向滑动切换类型存在偏移问题。改为：
   - 移除整个 `<swiper>`，改为 4 个独立结果列表容器，用 `typebar_if.cX` 条件控制显示，**彻底无水平滑动**
   - 类型导航条从纯文本改为 4 个可点击圆角按钮 `typebtn`（75×44px，深色背景），间隔 16px 防误触，点击 `SwitchType(idx)` 切换高亮与列表

72. **网桥 FetchBridge v3 接入尝试与回退（重要教训）**：按 AstroBox-NG-Plugin-MiWear-InterconnectFetch 的 PROTOCOL.md 实现了 v3 客户端（`src/fetchbridge/bridge.ts`：`__hs__` 握手 + caps 协商、fetch 单消息/分片重组、滑动窗口 ACK 流控、text/base64/hex 解码），并在 `app.ux` 启动时注册。**但安装后快应用一打开设备就重启**，判定为启动阶段（模块加载即 `interconnect.send` 握手）触发了系统级问题，已全部回退（删除模块、恢复 app.ux/request.ts/performance.ux/settings.ts）。教训：
   - **不要在 app.ux 启动阶段做 interconnect 收发**——模块顶层副作用 + 系统通道不可用时可能导致设备重启
   - 若要接入网桥，应改为：懒加载（用户显式开启后再初始化）、延迟握手（应用完全启动后 setTimeout）、或用 try-catch 包裹且不在模块顶层执行
   - 网桥客户端实现本身（协议 v3 完整逻辑）可复用，问题仅在接入时机

---

## 八、构建命令与项目配置

### 8.1 构建命令

使用 aiot-toolkit 构建：

```bash
# 开发构建
yarn build
# 或（Windows PowerShell 执行策略限制时）
node node_modules/aiot-toolkit/lib/bin.js build --enable-jsc --enable-protobuf

# 发布构建
yarn release

# 开发模式（带 watch）
yarn start
```

构建产物在 `dist/` 目录下，生成 `.rpk` 文件，可通过 AIOT IDE 安装到模拟器或真机。

### 8.2 项目配置文件

| 文件 | 作用 |
|------|------|
| [package.json](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/package.json) | 项目依赖、脚本命令 |
| [quickapp.config.js](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/quickapp.config.js) | 快应用构建配置，生成 buildinfo.ts |
| [src/manifest.json](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/manifest.json) | 应用清单（包名、版本、权限、路由、features） |
| .eslintignore / .prettierrc.js / .stylelintrc.js | 代码规范配置 |
| commitlint.config.js / husky.sh | Git 提交规范 |

### 8.3 应用基本信息

| 配置项 | 手表版（watch） | 手环版（band9 / Ring 系列） |
|--------|---------------|---------------------------|
| **包名** | `com.fwzjszd.hyperbilibili.dev` | `com.fwzjszd.hyperbilibili.dev`（同包名，不同打包参数） |
| **版本 versionName** | `2.5.3` | `2.5.3` |
| **versionCode** | `5` | `5`（保持一致，便于升级） |
| **deviceTypeList** | `["watch"]` | `["band9"]` |
| **设计宽度 designWidth** | `"device-width"`（自适应） | `"192px"`（固定，手环屏物理宽度） |
| **原生 fetch 能力** | ✅ 有（通过 `@system.fetch`） | ❌ 无，必须通过 `fetchproxy → interconnect → 手机 App` 代理 |
| **功能范围** | 全功能（含音频播放、专栏阅读、评论图片等） | 精简版（移除音频/专栏/评论图片等） |
| **包管理器** | Yarn | Yarn |

**构建变体说明**：通过切换 manifest.json 和条件编译实现两套构建产物：
- 手表版 RPK：`HyperBilibili-watch-v2.5.3.rpk`
- 手环版 RPK：`HyperBilibili-band9-v2.5.3.rpk`
- 两者共享 BilibiliClient 业务逻辑，仅底层 requestImpl（手表用原生 fetch，手环用 fetchproxy）和路由表不同

---

## 九、文件索引速查表

### 9.1 根目录工具文件

| 文件 | 作用 |
|------|------|
| [app.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/app.ux) | 应用入口，全局初始化（日志、UI引擎、动画、B站客户端等；手环版额外初始化 interconnect/fetchproxy） |
| [settings.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/settings.ts) | 用户设置管理（三档动画、评论图片、听视频字幕开关、字幕同步延时；手环版默认动画=关闭） |
| [savedcontent.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/savedcontent.ts) | 本地缓存管理（专栏、视频音频、视频雪碧图；分P区分） |
| [watchlater.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/watchlater.ts) | 稍后再看管理 |
| [tools.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/tools.ts) | 通用工具函数（数字格式化、设备信息、网络等；getDeviceSerial try-catch + 默认空串） |
| [articletools.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/articletools.ts) | 专栏工具（HTML生成、新数据结构适配） |
| [htmlparser.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/htmlparser.ts) | HTML 解析器（HTML → 渲染节点树） |
| [bgimg.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bgimg.ts) | 背景图管理 |
| [usertracker.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/usertracker.ts) | 用户行为追踪 |
| [jumpcheck.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/jumpcheck.ts) | 页面跳转校验 |
| [funnytips.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/funnytips.ts) | 趣味提示文案 |
| [eula.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/eula.ts) | 用户协议内容 |
| [tsimports.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/tsimports.ts) | 系统模块统一导入入口 |
| [buildinfo.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/buildinfo.ts) | 构建信息（自动生成，含 DESIGN_WIDTH、BUILD_TIME、deviceType 等） |
| [ui/ui.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/ui/ui.ts) | UI 引擎（虚拟页面池、页面栈、三档动画适配） |
| [logger/logger.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/logger/logger.ts) | 日志模块 |
| [interconnect/interconnect.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/interconnect/interconnect.ts) | **手环专用**：跨设备通信引擎（状态机、消息发送/响应、心跳保活、超时重试） |
| [interconnect/messageTypes.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/interconnect/messageTypes.ts) | **手环专用**：消息类型常量（PING/PONG/FETCH_REQUEST/FETCH_RESPONSE/ERROR） |
| [fetchproxy/fetchProxy.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/fetchproxy/fetchProxy.ts) | **手环专用**：伪 fetch 代理，接口与 Vela 原生 fetch 兼容，将请求通过 interconnect 转发给手机 App，上层 BilibiliClient 无感切换 |

### 9.2 B 站 API 客户端

| 文件 | 功能 |
|------|------|
| [client.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/client.ts) | 客户端主类（组合模式，整合所有子模块） |
| [api/request.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/api/request.ts) | HTTP 请求封装（get/post，自动携带 Cookie；返回 response.data） |
| [account/login.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/account/login.ts) | 二维码登录、Cookie 登录、登出 |
| [account/accountData.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/account/accountData.ts) | 用户信息、登录状态 |
| [video/video.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/video/video.ts) | 视频详情、播放地址、推荐、雪碧图（自动降画质）、字幕列表（player/v2）、字幕内容（HTTP） |
| [video/action.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/video/action.ts) | 点赞、投币、收藏、稍后再看 |
| [article/article.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/article/article.ts) | 专栏列表、详情、搜索 |
| [comment/comment.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/comment/comment.ts) | 评论列表、发布、回复、点赞 |
| [user/user.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/user/user.ts) | 用户空间、关注/取关（attribute===2 特殊情况）、用户关系 |
| [folder/favfolder.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/folder/favfolder.ts) | 收藏夹列表、收藏视频 |
| [folder/history.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/folder/history.ts) | 历史记录 |
| [message/message.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/message/message.ts) | 私信、@我、回复我、点赞我 |
| [search/search.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/search/search.ts) | 搜索视频、用户、专栏、综合 |
| [dynamic/dynamic.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/dynamic/dynamic.ts) | 动态列表、详情 |
| [utils/utils.ts](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/bilibiliclient/utils/utils.ts) | 工具函数（Wbi 签名等） |

### 9.3 主要页面速查

| 页面 | 路径 | 核心文件 |
|------|------|----------|
| 区域导航（底部Tab容器） | arealist | [arealist.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/arealist/arealist.ux) |
| 首页（推荐视频） | main | [main.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/main/main.ux) |
| 我的页面 | mypage | [mypage.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/mypage/mypage.ux) |
| 设置主页 | settings | [settings.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/settings/settings.ux) |
| 性能设置（含三档动画） | performance | [performance.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/settings/performance/performance.ux) |
| 清除缓存 | cleartmp | [cleartmp.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/settings/cleartmp/cleartmp.ux) |
| 关于（直接子元素布局） | about | [about.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/features/settings/about/about.ux) |
| 视频详情（含分P选择、章节入口） | videodetail | [videodetail.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/videodetail/videodetail.ux) |
| 视频内容（雪碧图/音频/字幕入口） | videocontent | [videocontent.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/videocontent/videocontent.ux) |
| 雪碧图查看（整图缩放+拖拽+OOM拦截） | spriteviewer | [spriteviewer.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/spriteviewer/spriteviewer.ux) |
| 字幕查看（多语言+分条显示） | subtitleviewer | [subtitleviewer.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/subtitleviewer/subtitleviewer.ux) |
| 章节跳转 | chapters | [chapters.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/chapters/chapters.ux) |
| 音频播放器（含字幕同步/章节跳转） | player | [player.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/video/player/player.ux) |
| 评论列表 | replys | [replys.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/reply/replys/replys.ux) |
| 专栏展示 | articleshow | [articleshow.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/article/articleshow/articleshow.ux) |
| 用户空间（含关注状态检测） | user | [user.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/user/user.ux) |
| 搜索 | search | [search.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/search/search/search.ux) |
| 登录 | login | [login.ux](file:///c:/Users/Administrator/Desktop/Hyperbili_Clone/HyperBilibili_AIMEv2.5.19/HyperBilibili/src/pages/app/entry/login/login.ux) |

---

> 本文档基于项目 `HyperBilibili AIME v2.5.3` 编写，记录了开发过程中的架构设计、功能实现和踩坑经验，供后续开发维护参考。
