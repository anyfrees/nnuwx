const app = getApp();

Page({
  data: {
    activeTab: 'cat',
    categories: [],
    tags: []
  },

  onShow() {
    this.setData({
      categories: app.globalData.categories || ['学术前沿', '技术笔记', '校园生活'],
      tags: app.globalData.tags || ['React', 'TypeScript', 'Hexo', 'AI助手']
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onSelectCategory(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: '/pages/index/index?cat=' + encodeURIComponent(name) });
  },

  onSelectTag(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: '/pages/index/index?tag=' + encodeURIComponent(name) });
  }
});