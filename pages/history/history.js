Page({
  data: {
    history: []
  },

  onShow() {
    const app = getApp();
    this.setData({ history: app.globalData.history || [] });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有阅读历史吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.history = [];
          wx.setStorageSync('history', []);
          this.setData({ history: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
