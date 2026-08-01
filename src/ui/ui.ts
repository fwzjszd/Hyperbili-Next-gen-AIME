import { router } from "../tsimports"

class GlobalActions {
    static AddToVmPool(vm){
        global.vmPool[vm._name] = vm
    }

    static UpdateCurrentPageName(){
        global.currentPageName = router.getState().name
    }

    static ClearCurrentVmSrcClass(){
        global.vmPool[global.currentPageName].scrclass = ""
    }
}

function runVmPoolGC(){
    for(var name in global.vmPool){
        if(global.vmPool[name]){
            if(global.vmPool[name].$valid){
                return
            }
        }

        global.logger.log("[ui.VmPoolGC] page named", name, " has been already destroyed.")
        delete global.vmPool[name]
    }
}

export function Init(){
    global.vmPool = {}
    global.currentPageName = ""
    global.logger.log("[ui.InitPage] inited.")

    setInterval(() => {
        runVmPoolGC()
    }, 10000)
}

export function InitPage(vm){
    GlobalActions.UpdateCurrentPageName()
    GlobalActions.AddToVmPool(vm)

    // 根据动画设置决定是否应用入场动画
    const animationMode = global.settings?.SETTINGS?.enableFullAnimation || '关闭'
    if (animationMode === '完整') {
        global.vmPool[global.currentPageName].scrclass = "scroll-withanim"
    } else {
        GlobalActions.ClearCurrentVmSrcClass()
    }

    global.logger.log("[ui.InitPage] vm set successed. name=", global.currentPageName)
}

export function OnBackPressTriggered(){
    GlobalActions.UpdateCurrentPageName()
    const animationMode = global.settings?.SETTINGS?.enableFullAnimation || '关闭'

    // 只有"开启"和"完整"档位才应用返回动画
    if (animationMode === '开启' || animationMode === '完整') {
        global.vmPool[global.currentPageName].scrclass = "scroll-backanim"
    }

    setTimeout(() => {
        GlobalActions.ClearCurrentVmSrcClass()
        router.back()

        var pageStack = router.getPages()
        var lastPageName = pageStack[pageStack.length - 2].name
        global.logger.log("lastpage=", lastPageName, "currentPage=", global.currentPageName)

        // 只有"开启"和"完整"档位才应用从后台返回动画
        if (animationMode === '开启' || animationMode === '完整') {
            global.vmPool[lastPageName].scrclass = ""
            global.vmPool[lastPageName].scrclass = "scroll-frombackanim"
        }
    }, animationMode === '关闭' ? 50 : 150)
}