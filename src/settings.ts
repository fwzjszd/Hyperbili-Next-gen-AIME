import { storage } from "./tsimports"

interface SettingsInterface {
  fresh_type: number; //视频推荐相关度，范围1-3，根据大数据推送
  home_vid_count: number;
  // 专栏articleshow的每页dom节点裁切数量（单页最大dom数）
  article_split_dom_count: number;
  enableFullAnimation: '关闭' | '开启' | '完整';
  enableCommentImages: boolean; // 评论区图片显示开关
  enableVideoSubtitle: boolean; // 听视频时字幕开关
  enableDanmaku: boolean; // 雪碧图播放时弹幕开关
  subtitleSyncOffset: number; // 字幕滚动同步延时（秒），范围-2.0~2.0
  keepScreenOn: number; // 屏幕常亮，0=关闭，1=开启
  startupPage: string;

  // 下面的设置项将不在设置页面中展示
  agreedAllAgreements: boolean;
  enableUserTracker: boolean;

  pinnedDMUsers: Array<string>;
}

// 初始设置
export let SETTINGS: SettingsInterface = {
  fresh_type: 3,
  home_vid_count: 10,
  article_split_dom_count: 9999,
  enableFullAnimation: '关闭',
  enableCommentImages: false, // 默认关闭评论区图片，节省内存
  enableVideoSubtitle: true, // 默认开启字幕
  enableDanmaku: true, // 默认开启弹幕
  danmakuMaxCount: 5, // 弹幕同屏最大数量（雪碧图播放器）
  subtitleSyncOffset: 0.3, // 默认同步延时0.3秒
  keepScreenOn: 0, // 默认关闭屏幕常亮
  startupPage: "主页",

  agreedAllAgreements: false, // 是否已同意所有协议（用户协议 隐私协议 etc.）
  enableUserTracker: true,

  pinnedDMUsers: []
};

export function loadSettings(): void {
  storage.get({
    key: 'settings',
    success: function (data) {
      if (data) {
        const storedSettings = JSON.parse(data);
        SETTINGS = {
          ...SETTINGS,
          ...storedSettings
        };
      }
      global.logger.log('Settings loaded:', SETTINGS);
    },
    fail: function (data, code) {
      global.logger.log(`Failed to load settings, code = ${code}`);
    }
  });
}

export function saveSettings(params: Partial<SettingsInterface>): void {
  SETTINGS = {
    ...SETTINGS,
    ...params
  };
  storage.set({
    key: 'settings',
    value: JSON.stringify(SETTINGS),
    success: function () {
      global.logger.log('Settings saved successfully');
    },
    fail: function (data, code) {
      global.logger.log(`Failed to save settings, code = ${code}`);
    }
  });
}