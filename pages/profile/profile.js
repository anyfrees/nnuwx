Page({
  data: {
    userInfo: null,
    themeText: '浅色模式',
    stats: {
      totalArticles: 0,
      totalViews: 0,
      totalCategories: 0,
      siteStartDate: '2020-01-01'
    },
    favCount: 0,
    histCount: 0
  },

  onShow() {
    // 同步自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }

    const app = getApp();

    this.setData({
      stats: app.globalData.stats,
      favCount: app.globalData.favorites.length,
      histCount: app.globalData.history.length
    });
  },

  // 主题切换（仅保留浅色模式）
  changeTheme() {
    wx.showToast({
      title: '当前仅支持浅色模式',
      icon: 'none',
      duration: 1500
    });
  },

  // 导航
  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  onShareAppMessage() {
    return {
      title: 'NNU技术博客 · 高颜值知识库小程序',
      path: '/pages/index/index'
    };
  }
});
