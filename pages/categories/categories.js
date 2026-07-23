Page({
  data: {
    activeTab: 'cat',
    categories: [],
    tags: []
  },

  onShow() {
    const app = getApp();
    const cats = (app && app.globalData && app.globalData.categories) ? app.globalData.categories : ['深度学习', 'AI应用', '前端开发', '学术前沿'];
    const tgs = (app && app.globalData && app.globalData.tags) ? app.globalData.tags : ['React', 'TypeScript', '小程序', 'NNU', 'Agent', 'AI Framework'];
    this.setData({
      categories: cats,
      tags: tgs
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onSelectCategory(e) {
    const name = e.currentTarget.dataset.name;
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.selectedCategory = name;
      app.globalData.selectedTag = null;
    }
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onSelectTag(e) {
    const name = e.currentTarget.dataset.name;
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.selectedTag = name;
      app.globalData.selectedCategory = null;
    }
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});