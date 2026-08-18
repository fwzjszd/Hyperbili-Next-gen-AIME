// 弹幕相关接口
export const BilibiliClientDanmakuMethods = {
    // 根据 cid 获取弹幕（B站历史XML接口，返回纯XML，无需protobuf解码）
    // 返回数组：[{ time, mode, fontSize, color, text }]
    // time：弹幕出现时间（秒，浮点）；mode：1滚动 4底部 5顶部 6逆向 7高级 8代码；color：十进制RGB
    async getDanmakuByCid(this: any, cid: string | number): Promise<any[]> {
        const url = `https://comment.bilibili.com/${cid}.xml`;
        global.logger.log("[getDanmakuByCid] url=" + url);
        try {
            const response = await this.fetch.fetch({
                url: url,
                responseType: 'text',
                header: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Encoding': '',
                    'Referer': 'https://www.bilibili.com',
                    'Origin': 'https://www.bilibili.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0'
                }
            });
            // Vela fetch 返回结构：response.data 为响应体；带 Cookie 时可能是 response.data.data
            let xmlText = response && response.data;
            if (xmlText && typeof xmlText === 'object') {
                xmlText = (xmlText.data !== undefined) ? xmlText.data : (xmlText.body || JSON.stringify(xmlText));
            }
            if (!xmlText || typeof xmlText !== 'string') {
                global.logger.error("[getDanmakuByCid] empty response");
                return [];
            }

            return this.parseDanmakuXml(xmlText);
        } catch (e) {
            global.logger.error("[getDanmakuByCid] Error: " + e.toString());
            return [];
        }
    },

    // 解析弹幕XML
    // <d p="time,mode,fontSize,color,sendTime,pool,userHash,rowId">弹幕文本</d>
    parseDanmakuXml(this: any, xmlText: string): any[] {
        const list: any[] = [];
        if (!xmlText) return list;
        const re = /<d\s+[^>]*p="([^"]*)"[^>]*>([\s\S]*?)<\/d>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(xmlText)) !== null) {
            const attrs = (m[1] || '').split(',');
            const time = parseFloat(attrs[0]) || 0;
            const mode = parseInt(attrs[1], 10) || 1;
            const fontSize = parseFloat(attrs[2]) || 25;
            const color = parseInt(attrs[3], 10) || 0xffffff;
            let text = m[2] || '';
            // 解码XML实体
            text = text.replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, '&')
                .trim();
            if (!text) continue;
            list.push({ time, mode, fontSize, color, text });
        }
        // 按出现时间排序，便于按播放进度派发
        list.sort((a, b) => a.time - b.time);
        global.logger.log("[parseDanmakuXml] count=" + list.length);
        return list;
    },

    // 十进制颜色转 #RRGGBB
    danmakuColorToHex(this: any, colorDec: number): string {
        let c = colorDec >>> 0;
        if (c > 0xffffff) c = 0xffffff;
        const r = (c >> 16) & 0xff;
        const g = (c >> 8) & 0xff;
        const b = c & 0xff;
        const toHex = (v: number) => v.toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
};
