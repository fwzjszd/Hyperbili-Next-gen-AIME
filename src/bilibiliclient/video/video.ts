export const BilibiliClientVideoMethods = {
    // 获取首页视频推荐
    async getMainPageRecommendVideos(this: any, fresh_type: number, pagesize: number): Promise<any> {
        const url = `https://api.bilibili.com/x/web-interface/index/top/rcmd?fresh_type=${fresh_type}&ps=${pagesize}&version=1`;
        const response = await this.getRequest(url);
        return response.data.data.item;
    },

    // 根据视频BV号获取视频详情信息
    async getVideoInfoByBVID(this: any, bvid: string): Promise<any> {
        const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        const response = await this.getRequest(url);
        return response.data.data;
    },

    // 判断视频是否被点赞
    async isVideoLikedByBVID(this: any, bvid: string): Promise<boolean> {
        const url = `https://api.bilibili.com/x/web-interface/archive/has/like?bvid=${bvid}`;
        const response = await this.getRequest(url);
        return response.data.data;
    },

    // 判断视频是否被投币
    async isVideoCoinedByBVID(this: any, bvid: string): Promise<boolean> {
        const url = `https://api.bilibili.com/x/web-interface/archive/coins?bvid=${bvid}`;
        const response = await this.getRequest(url);
        return response.data.data.multiply;
    },

    // 判断视频是否被收藏
    async isVideoStaredByBVID(this: any, bvid: string): Promise<boolean> {
        const url = `https://api.bilibili.com/x/v2/fav/video/favoured?aid=${bvid}`;
        const response = await this.getRequest(url);
        return response.data.data.favoured;
    },

    // 获取视频AI摘要
    async getVideoAISummaryByBVID(this: any, bvid: string, cid: string, up_mid: string) {
        const url = "https://api.bilibili.com/x/web-interface/view/conclusion/get";
        const response = await this.getRequestWbi(url, { bvid, cid, up_mid });
        return response.data.data.model_result.summary;
    },

    // 获取根据BVID与CID获取视频MP4流地址
    async getVideoMP4StreamByBVID(this: any, cid: string, bvid: string, qn: string = "32") {
        const url = `https://api.bilibili.com/x/player/wbi/playurl`;
        const response = await this.getRequestWbi(url, {
            cid,
            bvid,
            qn,
            fnval: "1",
            platform: "html5"
        });

        global.logger.log(response);
        return response.data.data;
    },

    // 获取视频帧信息（视频缩略图/雪碧图）
    // 参数 frameCount: 用户期望的帧数，用于计算合适的 API index 参数
    //   frameCount >= 45 → index=1 (约100帧，单帧最小)
    //   frameCount >= 24 → index=2 (约50帧)
    //   frameCount >= 15 → index=3 (约20-30帧)
    //   frameCount < 15  → index=4 (约10-15帧，单帧最大)
    //   frameCount = 0/不传 → index=1，拉取该视频全部雪碧图（长视频会有多张）
    async getVideoFramesByAID(this: any, aid: string, frameCount?: number, targetFrameSize?: number): Promise<any> {
        // 根据期望帧数计算 API index 参数
        let apiIndex = 1;
        if (frameCount && frameCount > 0) {
            if (frameCount >= 45) apiIndex = 1;
            else if (frameCount >= 24) apiIndex = 2;
            else if (frameCount >= 15) apiIndex = 3;
            else apiIndex = 4;
        }
        const url = `https://api.bilibili.com/x/player/videoshot?index=${apiIndex}&aid=${aid}`;
        const response = await this.getRequest(url);
        const data = response.data.data;
        if (!data || !data.image || data.image.length === 0) return data;

        const imgX = data.img_x_size || data.img_x || 100;
        const imgY = data.img_y_size || data.img_y || 100;
        const cols = data.img_x_len || data.img_cols || 10;
        const rows = data.img_y_len || data.img_rows || 10;

        // data.index 数组长度 = 整个视频全部有效帧总数 + 1（B站 videoshot 约定：
        // index[0]=0，index[i] 为第 i-1 帧的起始时间，最后一个元素为结束时间）。
        // 因此实际有效帧数 = index.length - 1，否则会多裁一帧落在雪碧图空白/越界区，
        // 表现为黑边/缺帧。
        const gridPerImage = cols * rows;
        const totalValidFrames = data.index && Array.isArray(data.index) && data.index.length > 1
            ? data.index.length - 1
            : data.image.length * gridPerImage;
        // 若调用方显式限制帧数（frameCount>0），则裁剪到该数量；0 表示全部
        const limitedFrames = (frameCount && frameCount > 0 && frameCount < totalValidFrames)
            ? frameCount : totalValidFrames;
        // 实际需要的雪碧图张数（每张满 gridPerImage 帧）
        const neededImages = Math.max(1, Math.ceil(limitedFrames / gridPerImage));
        if (data.image.length > neededImages) {
            data.image = data.image.slice(0, neededImages);
        }
        // 最后一张雪碧图的有效行数（前面的张都是满 rows 行）
        const framesInLast = limitedFrames - (neededImages - 1) * gridPerImage;
        const lastImageRows = Math.max(1, Math.ceil(framesInLast / cols));
        // crop_rows 给单张预览用：多图时表示末张有效行；单图时即全部有效行
        const actualRows = neededImages > 1 ? rows : Math.ceil(limitedFrames / cols);
        data.crop_rows = actualRows;
        data.total_frames = limitedFrames;
        data.image_count = data.image.length;
        data.last_image_rows = neededImages > 1 ? lastImageRows : actualRows;
        global.logger.log("[getVideoFramesByAID] apiIndex=" + apiIndex
            + " totalValidFrames=" + totalValidFrames + " limitedFrames=" + limitedFrames
            + " images=" + data.image.length + " gridPerImage=" + gridPerImage
            + " lastImageRows=" + data.last_image_rows);

        // 目标：单帧宽度。低画质（查看雪碧图）用 120；高画质（逐帧裁切播放）用 100。
        // 以 10×10 网格、16:9 帧计算解码内存（RGBA 4字节/像素）：
        //   100 → 1000×540 ≈ 2.16MB（播放页 4MB 阈值内，避免手表解码重启）
        //   120 → 1200×675 ≈ 3.24MB（viewer 4MB阈值内）
        const targetSize = (targetFrameSize && targetFrameSize > 0) ? targetFrameSize : 120;
        const rawWidth = imgX * cols;
        const rawHeight = imgY * rows;
        const usedHeight = imgY * actualRows; // 实际使用的区域高度（不含底部黑色空白）

        // 如果原始单帧已经小于等于目标尺寸，不需要压缩
        if (imgX <= targetSize) {
            global.logger.log("[getVideoFramesByAID] no resize needed, img_x=" + imgX + " <= " + targetSize);
            data.crop_rows = actualRows;
            data.total_frames = limitedFrames;
            data.image_count = data.image.length;
            data.last_image_rows = neededImages > 1 ? lastImageRows : actualRows;
            // 未缩放：image[] 本身即原始 CDN 基址，同样保留 original* 供播放页逐帧裁切
            data.originalImages = data.image.slice();
            data.originalImgX = imgX;
            data.originalImgY = imgY;
            data.originalCols = cols;
            data.originalRows = rows;
            data.frameList = this.buildVideoFrameCropList(data);
            return data;
        }

        // 计算缩放比例，使单帧宽度约为targetSize
        const ratio = targetSize / imgX;
        const newTotalWidth = Math.floor(rawWidth * ratio);
        const newTotalHeight = Math.floor(rawHeight * ratio);
        const usedCropHeight = Math.floor(usedHeight * ratio);

        global.logger.log("[getVideoFramesByAID] resizing: img_x=" + imgX + " -> " + targetSize
            + ", total=" + rawWidth + "x" + rawHeight + " -> " + newTotalWidth + "x" + newTotalHeight
            + ", used=" + rawWidth + "x" + usedHeight + " (crop " + actualRows + " rows)");

        // 使用B站CDN缩放参数 @widthw.jpg（仅按宽度等比缩放，保持纵横比）
        // 注意：不要用 @widthw_heighth.jpg，固定宽高会强制拉伸图片导致变形
        // 保留原始 CDN 地址，用于逐帧裁切（逐帧用原图坐标，不能用缩放后地址）
        const originalImages = data.image.slice();
        const newImages = data.image.map(function(imgUrl) {
            if (!imgUrl) return imgUrl;
            const atIdx = imgUrl.indexOf('@');
            let base = atIdx > 0 ? imgUrl.substring(0, atIdx) : imgUrl;
            if (!base.endsWith('.jpg')) {
                const dotIdx = base.lastIndexOf('.');
                if (dotIdx > 0) base = base.substring(0, dotIdx) + '.jpg';
            }
            return base + '@' + newTotalWidth + 'w.jpg';
        });

        data.image = newImages;
        // 逐帧裁切列表必须使用【原始 CDN 地址 + 原始单帧尺寸】，否则坐标会错乱
        const frameSource = {
            image: originalImages,
            img_x_size: imgX, img_y_size: imgY,
            img_x_len: cols, img_y_len: rows,
            total_frames: limitedFrames,
            index: data.index
        };
        data.frameList = this.buildVideoFrameCropList(frameSource);
        // 保留原始雪碧图基址与原始单帧尺寸，供播放页“逐帧按需构造裁切 URL”，
        // 避免一次性把数百条 frameList 全部常驻内存。
        data.originalImages = originalImages;
        data.originalImgX = imgX;
        data.originalImgY = imgY;
        data.originalCols = cols;
        data.originalRows = rows;
        // 注意：同时更新 img_x_size/img_y_size（B站API原始字段名）和 img_x/img_y（自定义字段名）
        // spriteviewer 读取时优先使用 img_x_size，必须同步更新
        data.img_x = targetSize;
        data.img_x_size = targetSize;
        data.img_y = Math.floor(imgY * ratio);
        data.img_y_size = Math.floor(imgY * ratio);
        data.crop_rows = actualRows; // 实际有效行数，给 sprite viewer 用
        data.total_frames = limitedFrames;
        data.image_count = data.image.length;
        data.last_image_rows = neededImages > 1 ? lastImageRows : actualRows;

        global.logger.log("[getVideoFramesByAID] resized URLs: " + newImages.slice(0, 2).join(" || ")
            + " img_x=" + data.img_x + " img_y=" + data.img_y
            + " total=" + newTotalWidth + "x" + newTotalHeight);
        return data;
    },

    // 根据雪碧图数据构建“逐帧 CDN 裁切地址”列表。
    // 裁切后缀格式：baseUrl@x-y-w-ha.jpg（B站图片 CDN 服务端裁切，区域左上角 x,y 与宽高 w,h）
    buildVideoFrameCropList(this: any, data: any): string[] {
        if (!data || !data.image || data.image.length === 0) return [];
        const cols = data.img_x_len || data.img_cols || 10;
        const rows = data.img_y_len || data.img_rows || 10;
        const cropW = data.img_x_size || data.img_x || 160;
        const cropH = data.img_y_size || data.img_y || 90;
        const framesPerImage = cols * rows;
        // 实际有效帧数：优先用 total_frames；否则按 index.length - 1 计算
        // （index 末尾元素是结束时间，不计为帧，否则会多裁一帧黑/缺画面）。
        let totalFrames: number;
        if (data.total_frames && data.total_frames > 0) {
            totalFrames = data.total_frames;
        } else if (data.index && Array.isArray(data.index) && data.index.length > 1) {
            totalFrames = data.index.length - 1;
        } else {
            totalFrames = data.image.length * framesPerImage;
        }
        const list: string[] = [];
        for (let i = 0; i < totalFrames; i++) {
            const url = this.buildVideoFrameCropUrl(data, i, cols, rows, cropW, cropH, framesPerImage);
            if (url) list.push(url);
        }
        return list;
    },

    // 按帧号即时构造“单帧 CDN 裁切地址”。
    // 供播放页逐帧调用，避免一次性把所有帧 URL（长视频可达数百条）全部构建并常驻内存。
    // 返回空串表示帧号越界或无可用雪碧图。
    buildVideoFrameCropUrl(this: any, data: any, frameIndex: number,
        cols?: number, rows?: number, cropW?: number, cropH?: number, framesPerImage?: number): string {
        if (!data || !data.image || data.image.length === 0) return '';
        const c = cols || (data.img_x_len || data.img_cols || 10);
        const r = rows || (data.img_y_len || data.img_rows || 10);
        const w = cropW || (data.img_x_size || data.img_x || 160);
        const h = cropH || (data.img_y_size || data.img_y || 90);
        const per = framesPerImage || (c * r);
        const spriteIdx = Math.floor(frameIndex / per);
        if (spriteIdx >= data.image.length) return '';
        const posInSheet = frameIndex % per;
        const col = posInSheet % c;
        const row = Math.floor(posInSheet / c);
        const x = col * w;
        const y = row * h;
        let baseUrl = data.image[spriteIdx];
        // 去掉已有的缩放/裁切后缀（@xxx.jpg），还原为 CDN 原图基址
        const atIdx = baseUrl.indexOf('@');
        if (atIdx > 0) baseUrl = baseUrl.substring(0, atIdx);
        if (!baseUrl.endsWith('.jpg')) {
            const dotIdx = baseUrl.lastIndexOf('.');
            if (dotIdx > 0) baseUrl = baseUrl.substring(0, dotIdx) + '.jpg';
        }
        // B站 videoshot 接口返回的是协议相对地址（//i0.hdslb.com/...），
        // 手表 <image> 无法识别无协议地址，必须补全 https: 前缀，否则逐帧全黑。
        if (baseUrl.indexOf('//') === 0) baseUrl = 'https:' + baseUrl;
        return baseUrl + '@' + x + '-' + y + '-' + w + '-' + h + 'a.jpg';
    },

    // 获取视频字幕列表
    // 策略：第一次请求结果直接保存（B站API第一次返回正确，连续请求会返回错误数据）
    // 仅使用 player/v2 接口
    async getVideoSubtitleList(this: any, bvid: string, cid: string, aid?: string): Promise<any[]> {
        const cacheKey = bvid + '_' + cid;
        const now = Date.now();

        // 初始化全局缓存
        if (!global.subtitleListCache) {
            global.subtitleListCache = {};
        }

        // 第一层：内存缓存（有缓存直接用，不请求API，避免连续请求导致数据错乱）
        const cached = global.subtitleListCache[cacheKey];
        if (cached && cached.data && cached.data.length > 0) {
            global.logger.log("[getVideoSubtitleList] cache HIT, age=" + Math.floor((now - cached.time) / 1000) + "s");
            return cached.data;
        }

        // 第二层：只请求一次，拿到结果立即保存（不重试，重试反而拿到错误数据）
        const url = `https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvid}`;
        global.logger.log("[getVideoSubtitleList] player/v2: " + url);

        try {
            const response = await this.getRequest(url);
            const respData = response && response.data;
            if (!respData) {
                global.logger.log("[getVideoSubtitleList] invalid response structure");
                // 过期缓存兜底
                if (cached && cached.data && cached.data.length > 0) return cached.data;
                return [];
            }

            // Vela fetch 双层嵌套：response.data.data 才是真正的数据对象
            const dataObj = respData.data;
            if (!dataObj) {
                global.logger.log("[getVideoSubtitleList] missing data.data");
                if (cached && cached.data && cached.data.length > 0) return cached.data;
                return [];
            }

            const loginSub = dataObj.need_login_subtitle;
            const subInfo = dataObj.subtitle;
            const subtitles = (subInfo && subInfo.subtitles) ? subInfo.subtitles : [];

            // 过滤出带非空 subtitle_url 的条目
            const withUrl = Array.isArray(subtitles)
                ? subtitles.filter(function(item) { return item && item.subtitle_url && item.subtitle_url.length > 0; })
                : [];

            global.logger.log("[getVideoSubtitleList] need_login_subtitle=" + loginSub
                + ", total=" + (Array.isArray(subtitles) ? subtitles.length : 0)
                + ", withUrl=" + withUrl.length
                + " preview: " + withUrl.slice(0, 3).map(function(x) { return (x.lan_doc + ':' + (x.subtitle_url || '').slice(0, 60)); }).join(" || "));

            if (withUrl.length === 0) {
                global.logger.log("[getVideoSubtitleList] empty subtitle list");
                if (cached && cached.data && cached.data.length > 0) return cached.data;
                return [];
            }

            // 第一次拿到就立即保存，不做任何校验（第一次结果就是正确的）
            global.subtitleListCache[cacheKey] = { data: withUrl, time: now };
            global.logger.log("[getVideoSubtitleList] saved to cache, count=" + withUrl.length);
            return withUrl;

        } catch (e) {
            global.logger.error("[getVideoSubtitleList] player/v2 Error: " + e.toString());
            // 过期缓存兜底
            if (cached && cached.data && cached.data.length > 0) {
                global.logger.log("[getVideoSubtitleList] fallback to cache on error");
                return cached.data;
            }
            return [];
        }
    },

    // 获取字幕内容（JSON格式）
    // subtitleUrl 形如 //aisubtitle.hdslb.com/bfs/ai_subtitle/prod/xxx.json
    // 缓存策略：内存缓存 -> 本地文件缓存（按 bvid+lan）-> 网络请求，成功后写入缓存
    async getVideoSubtitleContent(this: any, subtitleUrl: string, bvid: string, lan?: string): Promise<any> {
        const cacheKey = bvid + (lan ? '_' + lan : '');

        // 第一层：内存缓存
        if (!global.subtitleContentCache) global.subtitleContentCache = {};
        if (global.subtitleContentCache[cacheKey]) {
            global.logger.log("[getVideoSubtitleContent] memory cache HIT: " + cacheKey);
            return global.subtitleContentCache[cacheKey];
        }

        // 第二层：本地文件缓存（SavedContentManager 持久化，按 bvid+lan）
        if (lan && global.savedcontent && global.savedcontent.SavedContentManager) {
            try {
                const cachedStr = await global.savedcontent.SavedContentManager.getVideoSubtitleByBvidLang(bvid, lan);
                if (cachedStr) {
                    const parsed = JSON.parse(cachedStr);
                    global.subtitleContentCache[cacheKey] = parsed;
                    global.logger.log("[getVideoSubtitleContent] file cache HIT: " + cacheKey);
                    return parsed;
                }
            } catch (e) {
                global.logger.error("[getVideoSubtitleContent] file cache read Error: " + e.toString());
            }
        }

        let url = subtitleUrl;
        if (url.startsWith('//')) url = 'http:' + url;

        global.logger.log("[getVideoSubtitleContent] network request: " + url);

        try {
            // 字幕JSON需带视频页Referer避免403（必须使用http协议）
            const headers = this.getHeaders();
            headers['Referer'] = `http://www.bilibili.com/video/${bvid}`;
            delete headers['Accept-Encoding']; // 防止压缩后解析问题

            const response = await this.fetch.fetch({
                url,
                responseType: 'json',
                header: headers
            });
            global.logger.log("[getVideoSubtitleContent] raw response keys: " + JSON.stringify(Object.keys(response.data || {})));
            const result = response.data || {};
            // 尝试多种路径
            let body = result.body;
            if (!body && result.data && result.data.body) body = result.data.body;
            if (body) {
                result.body = body;
            }
            global.logger.log("[getVideoSubtitleContent] body length: " + (body ? body.length : 0));

            // 缓存成功结果（含合法 body）
            if (body && Array.isArray(body) && body.length > 0) {
                global.subtitleContentCache[cacheKey] = result;
                if (lan && global.savedcontent && global.savedcontent.SavedContentManager) {
                    try {
                        await global.savedcontent.SavedContentManager.storeVideoSubtitle(
                            bvid + '_' + lan,
                            JSON.stringify(result),
                            bvid,
                            lan
                        );
                        global.logger.log("[getVideoSubtitleContent] saved to file cache: " + cacheKey);
                    } catch (e) {
                        global.logger.error("[getVideoSubtitleContent] file cache write Error: " + e.toString());
                    }
                }
            }
            return result;
        } catch (error) {
            global.logger.error("[getVideoSubtitleContent] Error: " + (error && error.toString ? error.toString() : error));
            return null;
        }
    },

    // 获取视频字幕（自动选择首选语言，返回 {from, to, content} 数组）
    // 策略：第一次请求结果直接使用，不重试、不校验（B站API第一次返回正确）
    async getVideoSubtitles(this: any, bvid: string, cid: string): Promise<any[]> {
        global.logger.log("[getVideoSubtitles] start bvid=" + bvid + ", cid=" + cid);

        // 获取字幕列表（只请求一次，有缓存就用缓存）
        const list = await this.getVideoSubtitleList(bvid, cid);
        if (!list || list.length === 0) {
            global.logger.log("[getVideoSubtitles] no subtitle list");
            return [];
        }
        global.logger.log("[getVideoSubtitles] list: " + JSON.stringify(list.map(function(s) { return { lan: s.lan, lan_doc: s.lan_doc, subtitle_url: (s.subtitle_url || '').slice(0, 80) }; })));

        // 优先选择中文字幕，否则取第一个
        let target = list.find(function(s) { return s.lan === 'zh-CN' || s.lan === 'zh-Hans' || (s.lan_doc && s.lan_doc.includes('中')); });
        if (!target) target = list[0];
        global.logger.log("[getVideoSubtitles] target: " + JSON.stringify({ lan: target.lan, lan_doc: target.lan_doc, url: (target.subtitle_url || '').slice(0, 80) }));

        // 加载字幕内容（只请求一次）
        const content = await this.getVideoSubtitleContent(target.subtitle_url, bvid, target.lan);
        if (!content || !Array.isArray(content.body) || content.body.length === 0) {
            global.logger.log("[getVideoSubtitles] no content body");
            return [];
        }

        global.logger.log("[getVideoSubtitles] SUCCESS, lines=" + content.body.length);
        return content.body;
    },

    async getVideoBestAudioUrlByBVID(this: any, bvid: string): Promise<string> {
        const info = await this.getVideoInfoByBVID(bvid);
        const pages = info.pages || [];
        const cid = info.cid || (pages[0] && pages[0].cid);
        if (!cid) {
            throw new Error("cid not found");
        }
        return this.getVideoBestAudioUrlStringByCid(bvid, cid);
    },

    // 根据指定bvid+cid获取最佳音频URL（用于分P）
    // 返回 { url, bandwidth, duration, estimatedSize }
    // estimatedSize 为根据码率×时长估算的总字节数（DASH音频无Content-Length时用于进度显示）
    async getVideoBestAudioUrlByCid(this: any, bvid: string, cid: string): Promise<any> {
        if (!cid) {
            throw new Error("cid is empty");
        }

        const url = `https://api.bilibili.com/x/player/wbi/playurl`;
        const response = await this.getRequestWbi(url, {
            bvid,
            cid,
            fnval: 4048,
            fourk: 1,
            platform: "pc"
        });

        const payload = response && response.data ? response.data : response;
        if (!payload) {
            global.logger.error("[getVideoBestAudioUrlByCid] empty response");
            throw new Error("empty response");
        }
        global.logger.log("[getVideoBestAudioUrlByCid] code:", payload.code, "message:", payload.message, "cid:", cid);

        const dashData = payload.data && payload.data.dash ? payload.data.dash : (payload.dash || null);
        const dash = dashData;
        const audioTracks = dash && dash.audio ? dash.audio : [];
        // 时长（毫秒），DASH 层或 payload.data 层都可能携带
        const durationMs = (dash && (dash.duration || dash.Duration))
            || (payload.data && (payload.data.timelength || payload.data.duration))
            || 0;
        global.logger.log("[getVideoBestAudioUrlByCid] audioTracks length:", audioTracks.length, "durationMs:", durationMs);
        if (!audioTracks.length) {
            const keys = Object.keys(payload.data || payload || {});
            global.logger.error("[getVideoBestAudioUrlByCid] no audio tracks, payload keys:", keys);
            throw new Error("audio stream not found (cid=" + cid + ")");
        }

        audioTracks.sort(function(a, b) { return (b.bandwidth || 0) - (a.bandwidth || 0); });
        const best = audioTracks[0] || {};

        const candidates = [];
        const baseUrl = best.baseUrl || best.base_url;
        if (baseUrl) candidates.push(baseUrl);

        const backupUrls = best.backupUrl || best.backup_url;
        if (Array.isArray(backupUrls)) {
            backupUrls.forEach(function(u) {
                if (typeof u === "string" && u.length > 0) candidates.push(u);
            });
        }

        const uniqueCandidates = candidates.filter(function(u, idx) { return candidates.indexOf(u) === idx; });
        uniqueCandidates.sort(function(a, b) {
            function score(u) {
                let s = 0;
                if (u.indexOf("mcdn") >= 0) s -= 10;
                if (u.indexOf("upos") >= 0) s += 2;
                return s;
            }
            return score(b) - score(a);
        });

        const selected = uniqueCandidates[0];
        const bandwidth = best.bandwidth || 0;
        // 估算总大小（字节）：码率(bps) × 时长(秒) / 8
        const estimatedSize = (bandwidth > 0 && durationMs > 0)
            ? Math.floor((bandwidth * (durationMs / 1000)) / 8)
            : 0;
        global.logger.log("[getVideoBestAudioUrlByCid] selected url:", selected ? selected.slice(0, 100) + "..." : "null",
            "bandwidth:", bandwidth, "estimatedSize:", estimatedSize);
        return {
            url: selected,
            bandwidth: bandwidth,
            durationMs: durationMs,
            estimatedSize: estimatedSize
        };
    },

    // 兼容旧调用：仅返回URL字符串
    async getVideoBestAudioUrlStringByCid(this: any, bvid: string, cid: string): Promise<string> {
        const info = await this.getVideoBestAudioUrlByCid(bvid, cid);
        return info && info.url ? info.url : "";
    },

    // 获取远程音频文件的真实字节大小。
    // DASH 的 m4s CDN 通常支持 Range，发起 bytes=0-0 请求后从
    // Content-Range: bytes 0-0/<total> 中解析总长度；
    // 若不支持 Range，则回退到 Content-Length。失败返回 0。
    async getRemoteAudioSize(this: any, audioUrl: string, referer: string): Promise<number> {
        if (!audioUrl) return 0;
        const header: any = {
            "Range": "bytes=0-0",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        if (referer) header["Referer"] = referer;
        try {
            const response = await this.fetch.fetch({
                url: audioUrl,
                method: "GET",
                responseType: "text",
                header: header
            });
            const headers = (response && (response.header || response.headers)) || {};
            // 头字段名大小写在不同引擎上可能不同，统一找一遍
            function findHeader(name: string): string {
                const target = name.toLowerCase();
                const keys = Object.keys(headers);
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i].toLowerCase() === target) return headers[keys[i]];
                }
                return "";
            }
            const contentRange = findHeader("Content-Range") || findHeader("Content-range");
            if (contentRange) {
                // 形如 bytes 0-0/12345678 或 bytes 0-0/*
                const slashIdx = contentRange.lastIndexOf("/");
                if (slashIdx >= 0) {
                    const total = parseInt(contentRange.substring(slashIdx + 1), 10);
                    if (!isNaN(total) && total > 0) return total;
                }
            }
            const contentLength = parseInt(findHeader("Content-Length"), 10);
            if (!isNaN(contentLength) && contentLength > 0) return contentLength;
        } catch (e) {
            global.logger.error("[getRemoteAudioSize] error: " + (e && e.toString ? e.toString() : e));
        }
        return 0;
    },

};
