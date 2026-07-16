import { asyncFile } from "./asyncapi/file";

interface WatchLaterVideo {
  bvid: string;
  title: string;
  pic: string;
  owner: {
    name: string;
    mid?: string;
  };
  stat: {
    view: number;
  };
  duration: number;
  addTime: number;
}

let watchLaterList: WatchLaterVideo[] = [];
const baseUri = 'internal://files/biliwatchlater/';
const indexFileUri = `${baseUri}index.json`;

// 同步 watchLaterList 到本地文件
async function saveWatchLaterIndex(): Promise<void> {
  try {
    const indexData = JSON.stringify(watchLaterList);
    await asyncFile.writeText({
      uri: indexFileUri,
      text: indexData
    });
  } catch (e) {
    global.logger.error(`[WatchLaterManager] saveWatchLaterIndex Error: ${e.toString()}`);
  }
}

// 从本地文件加载 watchLaterList
async function loadWatchLaterIndex(): Promise<void> {
  try {
    const fileExists = await asyncFile.access({ uri: indexFileUri });
    if (fileExists) {
      const indexData = await asyncFile.readText({ uri: indexFileUri });
      watchLaterList = JSON.parse(indexData);
    } else {
      watchLaterList = [];
    }
  } catch (e) {
    global.logger.error(`[WatchLaterManager] loadWatchLaterIndex Error: ${e.toString()}`);
    watchLaterList = [];
  }
}

export class WatchLaterManager {
  // 初始化时加载 watchLaterList
  static async initialize(): Promise<void> {
    // 确保目录存在
    try {
      await asyncFile.mkdir({ uri: baseUri });
    } catch (e) {
      // 目录可能已存在，忽略错误
    }
    await loadWatchLaterIndex();
    global.logger.log("loaded WatchLater list", watchLaterList.length);
  }

  // 添加视频到稍后再看（接收完整视频对象）
  static async addVideo(videoInfo: any): Promise<boolean> {
    try {
      const bvid = videoInfo.bvid;
      // 检查是否已存在
      const exists = watchLaterList.some(item => item.bvid === bvid);
      if (exists) {
        global.logger.log(`[WatchLaterManager] 视频已在稍后再看列表中: ${bvid}`);
        return false;
      }

      const video: WatchLaterVideo = {
        bvid: videoInfo.bvid,
        title: videoInfo.title,
        pic: videoInfo.pic,
        owner: {
          name: videoInfo.owner?.name || "",
          mid: videoInfo.owner?.mid || ""
        },
        stat: {
          view: videoInfo.stat?.view || 0
        },
        duration: videoInfo.duration || 0,
        addTime: Date.now()
      };

      watchLaterList.unshift(video); // 最新添加的在最前面
      await saveWatchLaterIndex();
      global.logger.log(`[WatchLaterManager] 已添加到稍后再看: ${videoInfo.title}, bvid: ${bvid}`);
      return true;
    } catch (e) {
      global.logger.error(`[WatchLaterManager] addVideo Error: ${e.toString()}`);
      return false;
    }
  }

  // 从稍后再看移除视频
  static async removeVideo(bvid: string): Promise<boolean> {
    try {
      const index = watchLaterList.findIndex(item => item.bvid === bvid);
      if (index === -1) {
        global.logger.log(`[WatchLaterManager] 视频不在稍后再看列表中: ${bvid}`);
        return false;
      }

      watchLaterList.splice(index, 1);
      await saveWatchLaterIndex();
      global.logger.log(`[WatchLaterManager] 已从稍后再看移除: ${bvid}`);
      return true;
    } catch (e) {
      global.logger.error(`[WatchLaterManager] removeVideo Error: ${e.toString()}`);
      return false;
    }
  }

  // 检查视频是否在稍后再看列表中
  static isVideoInWatchLater(bvid: string): boolean {
    return watchLaterList.some(item => item.bvid === bvid);
  }

  // 获取稍后再看列表
  static getWatchLaterList(): WatchLaterVideo[] {
    return [...watchLaterList];
  }

  // 清空稍后再看列表
  static async clearWatchLater(): Promise<void> {
    try {
      watchLaterList = [];
      await saveWatchLaterIndex();
      global.logger.log(`[WatchLaterManager] 已清空稍后再看列表`);
    } catch (e) {
      global.logger.error(`[WatchLaterManager] clearWatchLater Error: ${e.toString()}`);
    }
  }
}
