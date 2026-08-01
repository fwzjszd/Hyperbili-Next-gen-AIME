function convertTextNodesToInlineHtml(nodes: any[]): string {
    let html = "";
    if (!nodes || !Array.isArray(nodes)) return html;

    for (const node of nodes) {
        if (!node) continue;

        const nodeType = node.type || "";
        if (nodeType === "TEXT_NODE_TYPE_WORD" && node.word && node.word.words) {
            let text = node.word.words;
            const style = node.word.style || {};
            if (style.bold) {
                text = `<strong>${text}</strong>`;
            }
            if (style.italic) {
                text = `<em>${text}</em>`;
            }
            if (style.strikethrough) {
                text = `<del>${text}</del>`;
            }
            if (style.underline) {
                text = `<u>${text}</u>`;
            }
            if (style.background) {
                text = `<span style="background:${style.background}">${text}</span>`;
            }
            html += text;
        } else if (node.rich && node.rich.text) {
            html += node.rich.text;
        } else if (node.word && typeof node.word === "string") {
            html += node.word;
        }
    }
    return html;
}

function convertParagraphsToHtml(paragraphs: any[]): string {
    let html = "";
    if (!paragraphs || !Array.isArray(paragraphs)) return html;

    for (const para of paragraphs) {
        if (!para) continue;
        const paraType = para.para_type;

        switch (paraType) {
            case 1:
                if (para.text && para.text.nodes && Array.isArray(para.text.nodes)) {
                    const inlineHtml = convertTextNodesToInlineHtml(para.text.nodes);
                    if (inlineHtml) {
                        html += `<p>${inlineHtml}</p>`;
                    }
                } else if (para.text && typeof para.text === "string") {
                    html += `<p>${para.text}</p>`;
                }
                break;
            case 2:
                if (para.pic && Array.isArray(para.pic)) {
                    for (const pic of para.pic) {
                        const src = pic.url || pic.src || "";
                        if (src) {
                            const width = pic.width || "";
                            const height = pic.height || "";
                            const alt = pic.desc || pic.name || "";
                            html += `<img src="${src}" width="${width}" height="${height}" alt="${alt}" />`;
                        }
                    }
                }
                break;
            case 3:
                if (para.heading) {
                    const level = para.heading.level || 3;
                    let headingText = "";
                    if (para.heading.nodes && Array.isArray(para.heading.nodes)) {
                        headingText = convertTextNodesToInlineHtml(para.heading.nodes);
                    } else if (para.heading.text) {
                        headingText = para.heading.text;
                    }
                    if (headingText) {
                        html += `<h${level}>${headingText}</h${level}>`;
                    }
                }
                break;
            case 4:
                if (para.blockquote) {
                    let quoteText = "";
                    if (para.blockquote.nodes && Array.isArray(para.blockquote.nodes)) {
                        quoteText = convertTextNodesToInlineHtml(para.blockquote.nodes);
                    } else if (para.blockquote.text) {
                        quoteText = para.blockquote.text;
                    }
                    if (quoteText) {
                        html += `<blockquote>${quoteText}</blockquote>`;
                    }
                }
                break;
            case 5:
                if (para.list && para.list.items && Array.isArray(para.list.items)) {
                    const tag = para.list.order ? "ol" : "ul";
                    html += `<${tag}>`;
                    for (const item of para.list.items) {
                        let itemText = "";
                        if (item.nodes && Array.isArray(item.nodes)) {
                            itemText = convertTextNodesToInlineHtml(item.nodes);
                        } else if (item.text) {
                            itemText = item.text;
                        }
                        html += `<li>${itemText}</li>`;
                    }
                    html += `</${tag}>`;
                }
                break;
            case 6:
                if (para.code && para.code.text) {
                    html += `<pre><code>${para.code.text}</code></pre>`;
                }
                break;
            case 7:
                html += `<hr />`;
                break;
            default:
                if (para.text && para.text.nodes && Array.isArray(para.text.nodes)) {
                    const inlineHtml = convertTextNodesToInlineHtml(para.text.nodes);
                    if (inlineHtml) {
                        html += `<p>${inlineHtml}</p>`;
                    }
                } else if (para.text && typeof para.text === "string") {
                    html += `<p>${para.text}</p>`;
                }
                break;
        }
    }
    return html;
}

function normalizeArticleData(data: any): any {
    if (!data) return null;

    if (data.readInfo && data.readInfo.content) {
        return data;
    }

    if (data.detail && data.detail.modules && Array.isArray(data.detail.modules)) {
        const modules = data.detail.modules;
        let title = "";
        let authorName = "";
        let authorMid = 0;
        let contentHtml = "";

        for (const mod of modules) {
            if (mod.module_title) {
                title = mod.module_title.text || mod.module_title.title || title;
            }
            if (mod.module_author) {
                authorName = mod.module_author.name || authorName;
                authorMid = mod.module_author.mid || authorMid;
            }
            if (mod.module_content && mod.module_content.paragraphs) {
                contentHtml += convertParagraphsToHtml(mod.module_content.paragraphs);
            }
        }

        const readInfo = {
            title: title,
            author: {
                name: authorName,
                mid: authorMid
            },
            content: contentHtml
        };

        return {
            readInfo: readInfo,
            detail: data.detail
        };
    }

    return data;
}

function extractInitialState(html: string): any | null {
    const idx = html.indexOf("window.__INITIAL_STATE__");
    if (idx === -1) return null;

    const start = html.indexOf("{", idx);
    if (start === -1) return null;

    let depth = 0;
    let end = -1;
    for (let i = start; i < html.length; i++) {
        if (html[i] === "{") {
            depth++;
        } else if (html[i] === "}") {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }

    if (end === -1) return null;

    try {
        return JSON.parse(html.substring(start, end + 1));
    } catch (e) {
        global.logger.error("Error parsing __INITIAL_STATE__ JSON:", e);
        return null;
    }
}

export function parseArticlePageHtml(html: string): any | null {
    const rawData = extractInitialState(html);
    if (!rawData) {
        return null;
    }

    const normalized = normalizeArticleData(rawData);
    global.logger.log("[parseArticlePageHtml] normalized readInfo.title:", normalized && normalized.readInfo && normalized.readInfo.title);
    global.logger.log("[parseArticlePageHtml] content length:", normalized && normalized.readInfo && normalized.readInfo.content ? normalized.readInfo.content.length : 0);
    return normalized;
}

export function PatchArticleContent(doms: any) {
    try{
        global.logger.log("dom length: ", doms.length);

        const isOnline = global.DEVICE_NETWORK_TYPE !== 'none';
        global.logger.log("[PatchArticleContent] isOnline: " + isOnline + ", networkType: " + global.DEVICE_NETWORK_TYPE);

        const stack = [...doms];

        while (stack.length > 0) {
            const dom = stack.pop();

            if (!dom) continue;

            if (dom.type === "img") {
                if (!isOnline) {
                    dom.type = "hbhtmlrenderer-notsupportimage-tip";
                    dom.text = "[图片]（离线模式，暂不显示图片）";
                    dom.attributes = {};
                    dom.children = [];
                    continue;
                }

                if (dom.attributes.src.includes(".png") || dom.attributes.src.includes(".jpg") || dom.attributes.src.includes(".webp")) {
                    if (!(dom.attributes.src.startsWith("http://") || dom.attributes.src.startsWith("https://"))) {
                        dom.attributes.src = "https:" + dom.attributes.src;
                    }

                    if(dom.attributes){
                        if (parseInt(dom.attributes.height) > 500 || parseInt(dom.attributes.height) > 500) {
                            dom.attributes.src += "@250h";
                            dom.attributes._patched_sign = "large_picture_scaled"
                        }
                    }
                } else {
                    dom.type = "hbhtmlrenderer-notsupportimage-tip";
                    dom.text = `暂不支持显示该类型的图片（${dom.attributes.src}）`;
                    dom.attributes = {};
                    dom.children = [];
                }
            }

            if (dom.children && dom.children.length > 0) {
                stack.push(...dom.children);
            }
        }
    }
    catch (e){
        global.logger.error("[articletools] Patch Error: " + e.toString())
    }
}

export function estimateReadingTime(htmlContent: string): number {
    const plainText = htmlContent.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const wordCount = plainText.split(/\s+/).length;
    // 人类平均阅读速度为250字/分钟
    // 但在小屏幕上，速度会受限。
    const averageReadingSpeed = 100; // 字数/分钟
    const estimatedTime = Math.ceil(wordCount / averageReadingSpeed);

    return estimatedTime
}