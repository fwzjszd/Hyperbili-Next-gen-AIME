import { asyncFile } from "./asyncapi/file";

interface StoredContent {
  id: string;
  title: string;
  type: string;
  fileUri: string;
  coverUrl?: string;
  author?: string;
  bvid?: string;
  lang?: string;
}

let storageIndex: StoredContent[] = [];

const baseUri = 'internal://files/bilisavedcontent/';
const audioDirUri = `${baseUri}audio/`;
const indexFileUri = `${baseUri}index.json`;

// 同步 storageIndex 到本地文件
async function saveStorageIndex(): Promise<void> {
  try {
    global.logger.log(storageIndex)
    const indexData = JSON.stringify(storageIndex);
    await asyncFile.writeText({
      uri: indexFileUri,
      text: indexData
    });
  } catch (e) {
    global.logger.error(`[SavedContentManager] saveStorageIndex Error: ${e.toString()}`);
  }
}

// 从本地文件加载 storageIndex
async function loadStorageIndex(): Promise<void> {
  try {
    const fileExists = await asyncFile.access({ uri: indexFileUri });
    if (fileExists) {
      const indexData = await asyncFile.readText({ uri: indexFileUri });
      storageIndex = JSON.parse(indexData);
    } else {
      storageIndex = [];
    }
  } catch (e) {
    global.logger.error(`[SavedContentManager] loadStorageIndex Error: ${e.toString()}`);
    storageIndex = [];
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SavedContentManager {
  // 初始化时加载 storageIndex
  static async initialize(): Promise<void> {
    await loadStorageIndex()
    global.logger.log("loaded SavedContent StorageIndex", storageIndex)
  }

  // 存储内容
  static async storeContent(title: string, data: string, type: string): Promise<string | void> {
    try {
      const id = generateUUID();
      const fileUri = `${baseUri}${id}.txt`;

      await asyncFile.writeText({ uri: fileUri, text: data });

      storageIndex.push({ id, title, type, fileUri });
      await saveStorageIndex();

      return id;
    } catch (e) {
      global.logger.error(`[SavedContentManager] storeContent Error: ${e.toString()}`);
    }
  }

  // 存储视频音频：把下载产生的临时文件（通常在 cache 目录，会被系统清理）
  // 移动到持久化的 files/bilisavedcontent/audio/ 目录，再把持久路径写入索引。
  // 否则播放时引用的 cache 文件已不存在，报 errno=-2 / file doesn't exist。
  static async storeVideoAudio(title: string, audioUri: string, coverUrl: string, author: string, bvid: string): Promise<{ id: string; uri: string } | void> {
    try {
      const id = generateUUID();
      let persistedUri = audioUri;

      // 仅当来源不是持久目录时才需要搬运（cache/tmp 等临时路径）
      if (audioUri && audioUri.indexOf(audioDirUri) !== 0) {
        // 确保音频目录存在（recursive 兼容已存在的情况）
        try {
          await asyncFile.mkdir({ uri: audioDirUri, recursive: true });
        } catch (e) {
          // 目录已存在等情况可忽略
        }

        // 保留原始扩展名（通常为 .m4s），避免音频组件因后缀无法识别
        let ext = '.m4s';
        const dotIdx = audioUri.lastIndexOf('.');
        if (dotIdx > 0) {
          const tail = audioUri.substring(dotIdx);
          // 去掉查询串/路径分隔，只取纯扩展名
          const clean = tail.split(/[?\/]/)[0];
          if (clean && clean.length <= 6) ext = clean;
        }
        const dstUri = `${audioDirUri}${id}${ext}`;

        try {
          // 优先移动（同分区/同卷下更快）；失败则回退为复制
          await asyncFile.move({ srcUri: audioUri, dstUri });
          persistedUri = dstUri;
        } catch (moveErr) {
          global.logger.log(`[SavedContentManager] move audio failed, fallback to copy: ${moveErr.toString()}`);
          await asyncFile.copy({ srcUri: audioUri, dstUri });
          persistedUri = dstUri;
          // 复制成功后尝试删除临时源文件，失败不影响结果
          try {
            await asyncFile.delete({ uri: audioUri });
          } catch (e) {}
        }
      }

      storageIndex.push({
        id,
        title,
        type: 'videoAudio',
        fileUri: persistedUri,
        coverUrl,
        author,
        bvid
      });
      await saveStorageIndex();

      global.logger.log(`[SavedContentManager] 视频音频已保存: ${title}, id: ${id}, uri: ${persistedUri}`);
      return { id, uri: persistedUri };
    } catch (e) {
      global.logger.error(`[SavedContentManager] storeVideoAudio Error: ${e.toString()}`);
    }
  }

  // 存储视频雪碧图数据
  static async storeVideoSprite(title: string, spriteData: string, bvid: string): Promise<string | void> {
    try {
      const id = generateUUID();
      const fileUri = `${baseUri}${id}.json`;

      await asyncFile.writeText({ uri: fileUri, text: spriteData });

      storageIndex.push({ id, title, type: 'videoSprite', fileUri, bvid });
      await saveStorageIndex();

      global.logger.log(`[SavedContentManager] 视频雪碧图已保存: ${title}, id: ${id}`);
      return id;
    } catch (e) {
      global.logger.error(`[SavedContentManager] storeVideoSprite Error: ${e.toString()}`);
    }
  }

  // 检查视频雪碧图是否已存在
  static async checkVideoSpriteExists(bvid: string): Promise<boolean> {
    await loadStorageIndex();
    const exists = storageIndex.some(item => item.bvid === bvid && item.type === 'videoSprite');
    return exists;
  }

  // 检查指定 bvid 的视频音频是否已存在；存在则返回该条索引（含 fileUri），否则返回 null。
  // 旧调用方按布尔判断依然可用（对象为 truthy、null 为 falsy）。
  static async checkVideoAudioExists(bvid: string): Promise<any> {
    const item = storageIndex.find(entry => entry.bvid === bvid && entry.type === 'videoAudio');
    return item || null;
  }

  // 存储视频字幕内容（按 bvid+lang 区分）
  static async storeVideoSubtitle(title: string, subtitleData: string, bvid: string, lang: string): Promise<string | void> {
    try {
      const id = generateUUID();
      const fileUri = `${baseUri}${id}.json`;

      await asyncFile.writeText({ uri: fileUri, text: subtitleData });

      storageIndex.push({ id, title, type: 'videoSubtitle', fileUri, bvid, lang });
      await saveStorageIndex();

      global.logger.log(`[SavedContentManager] 视频字幕已保存: ${title}, bvid=${bvid}, lang=${lang}, id=${id}`);
      return id;
    } catch (e) {
      global.logger.error(`[SavedContentManager] storeVideoSubtitle Error: ${e.toString()}`);
    }
  }

  // 按 bvid+lang 读取字幕内容（返回原始JSON字符串，无缓存返回null）
  static async getVideoSubtitleByBvidLang(bvid: string, lang: string): Promise<string | null> {
    try {
      await loadStorageIndex();
      const item = storageIndex.find(x => x.bvid === bvid && x.type === 'videoSubtitle' && x.lang === lang);
      if (!item) return null;

      const fileExists = await asyncFile.access({ uri: item.fileUri });
      if (!fileExists) {
        global.logger.log(`[SavedContentManager] 字幕文件不存在：${item.fileUri}`);
        return null;
      }

      return await asyncFile.readText({ uri: item.fileUri });
    } catch (e) {
      global.logger.error(`[SavedContentManager] getVideoSubtitleByBvidLang Error: ${e.toString()}`);
      return null;
    }
  }

  // 检查 bvid+lang 字幕是否已缓存
  static async checkVideoSubtitleExists(bvid: string, lang: string): Promise<boolean> {
    await loadStorageIndex();
    return storageIndex.some(item => item.bvid === bvid && item.type === 'videoSubtitle' && item.lang === lang);
  }

  // 根据 id 或 title 读取内容
  static async getContent(identifier: string): Promise<string | null> {
    try {
      const content = storageIndex.find(item => item.id === identifier || item.title === identifier);
      if (!content) return null;

      // 读取文件内容
      const fileExists = await asyncFile.access({ uri: content.fileUri });
      if (!fileExists) {
        global.logger.log(`[SavedContentManager] 文件不存在：${content.fileUri}`);
        return null;
      }

      return await asyncFile.readText({ uri: content.fileUri });
    } catch (e) {
      global.logger.error(`[SavedContentManager] getContent Error: ${e.toString()}`);
      return null;
    }
  }

  // 读取所有存储内容的 id 和 title 列表
  static async listAllContent(): Promise<any> {
    return [...storageIndex];
  }

  // 删除内容
  static async deleteContent(identifier: string): Promise<void> {
    try {
      const contentIndex = storageIndex.findIndex(item => item.id === identifier || item.title === identifier);
      if (contentIndex === -1) throw new Error('Content not found');

      // 删除文件（如果文件存在）
      const fileUri = storageIndex[contentIndex].fileUri;
      const fileExists = await asyncFile.access({ uri: fileUri });
      if (fileExists) {
        await asyncFile.delete({ uri: fileUri });
      }

      // 从 storageIndex 中删除记录并保存
      storageIndex.splice(contentIndex, 1);
      await saveStorageIndex();
    } catch (e) {
      global.logger.error(`[SavedContentManager] deleteContent Error: ${e.toString()}`);
    }
  }
}