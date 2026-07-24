Page({
  data: {
    favorites: []
  },

  onShow() {
    const app = getApp();
    this.setData({ favorites: app.globalData.favorites || [] });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  removeFavorite(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    const article = { id };
    app.toggleFavorite(article);
    this.setData({ favorites: app.globalData.favorites || [] });
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '已取消收藏', icon: 'none' });
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有收藏吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.favorites = [];
          wx.setStorageSync('favorites', []);
          this.setData({ favorites: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
