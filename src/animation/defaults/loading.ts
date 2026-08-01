export function CreateLoadingAnimation(pageModel: any, colorReverse = true){
    // anims存在性检测
    if(!pageModel.anims){
        pageModel.anims = {}
    }

    var folderName = "loadingWhite"
    var addStr = "-white"
    if(!colorReverse){
        folderName = "loading"
        addStr = ""
    }

    // 创建动画元素
    pageModel.anims.loading_src = { value: `/common/seqanims/${folderName}/icons8-loading${addStr}-1.png` }

    // 根据动画设置决定是否创建序列帧动画
    const animationMode = global.settings?.SETTINGS?.enableFullAnimation || '关闭'
    if (animationMode === '完整') {
        pageModel.anims.loading = new global.animengine.SequenceAnim(
            pageModel.$page.name,
            pageModel.anims.loading_src,
            28,
            `/common/seqanims/${folderName}/icons8-loading${addStr}-*.png`,
            1000,
            true
        )
    } else if (animationMode === '开启') {
        // "开启"档位使用静态loading图标
        pageModel.anims.loading = {
            start: () => {},
            stop: () => {}
        }
    } else {
        // "关闭"档位不显示loading
        pageModel.anims.loading = {
            start: () => {},
            stop: () => {}
        }
        pageModel.anims.show_loading = false
        global.logger.log("[Animation Engine] Loading Animation disabled for page", pageModel.$page.name)
        return
    }

    pageModel.anims.show_loading = true

    global.logger.log("[Animation Engine] Created Loading Animation for page", pageModel.$page.name)
}