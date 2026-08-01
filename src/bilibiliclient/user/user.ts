export const BilibiliClientUserMethods = {
    // 获取单个用户的信息
    async getUserInfoByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/space/wbi/acc/info`;
        const response = await this.getRequestWbi(url, {
            mid: uid
        });

        return response.data.data
    },

    // 获取单个用户的状态数
    async getUserStatByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/relation/stat`;
        const response = await this.getRequest(`${url}?vmid=${uid}`);

        return response.data.data
    },

    // 获取单个用户投稿的视频的代表作
    async getUserMasterPieceByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/space/masterpiece`;
        const response = await this.getRequest(`${url}?vmid=${uid}`);

        return response.data.data
    },

    // 获取用户投稿列表（分页）
    async getUserVideosByUID(this: any, uid: String, pn: Number, ps: Number = 5) {
        const url = `https://api.bilibili.com/x/space/wbi/arc/search`;
        const response = await this.getRequestWbi(url, {
            mid: uid,
            pn,
            ps
        });

        return response.data.data
    },

    // 获取用户空间动态列表
    async getUserDynamicListByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space`;
        const response = await this.getRequest(`${url}?host_mid=${uid}`);

        return response.data.data
    },

    // 获取单个用户的导航栏状态数
    async getUserNavnumByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/space/navnum`;
        const response = await this.getRequest(`${url}?mid=${uid}`);

        return response.data.data
    },

    // 根据UID批量获取用户信息
    async getMultiUserInfoByUID(this: any, uids: Array<String>) {
        const url = "https://api.bilibili.com/x/polymer/pc-electron/v1/user/cards";
        let param = "";
        uids.forEach(uid => {
            if(uid.toString().length > 0){
                param += uid
                if (uids.indexOf(uid) != uids.length - 1) {
                    param += ","
                }
            }
        });
        const response = await this.getRequest(`${url}?uids=${param}`)

        return response.data.data
    },

    // 获取与指定用户的关注关系
    async getUserRelationByUID(this: any, uid: String) {
        const url = `https://api.bilibili.com/x/relation`;
        const response = await this.getRequest(`${url}?fid=${uid}`);
        return response.data.data
    },

    // 关注用户
    async followUser(this: any, uid: String) {
        const url = "https://api.bilibili.com/x/relation/modify";
        const body = `fid=${uid}&act=1&re_src=11&csrf=${this.biliJct}`;
        const response = await this.postRequest(url, body, "application/x-www-form-urlencoded");
        return response.data
    },

    // 取消关注用户
    async unfollowUser(this: any, uid: String) {
        const url = "https://api.bilibili.com/x/relation/modify";
        const body = `fid=${uid}&act=2&re_src=11&csrf=${this.biliJct}`;
        const response = await this.postRequest(url, body, "application/x-www-form-urlencoded");
        return response.data
    }
}