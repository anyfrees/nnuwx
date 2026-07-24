const { FALLBACK_COVERS } = require('../../utils/parser.js');

Page({
  data: {
    title: '',
    type: '',         // 'category' or 'tag'
    articles: [],
    loading: true,
    icon: '/images/icons/folder.png'
  },

  onLoad(options) {
    const type = options.type || 'category';
    const name = decodeURIComponent(options.name || '');
    const icon = options.icon ? decodeURIComponent(options.icon) : '/images/icons/folder.png';

    const app = getApp();
    const allArticles = app.globalData.articles || [];

    let filtered = [];
    if (type === 'category') {
      filtered = allArticles.filter(a =>
        a.categories && a.categories.includes(name)
      );
    } else if (type === 'tag') {
      filtered = allArticles.filter(a =>
        a.tags && a.tags.includes(name)
      );
    }

    // 图标映射
    let finalIcon = icon;
    if (type === 'tag') {
      finalIcon = '/images/icons/tag.png';
    }

    this.setData({
      title: name,
      type: type,
      articles: filtered,
      loading: false,
      icon: finalIcon
    });

    wx.setNavigationBarTitle({ title: name || '文章列表' });
  },

  onArticleTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  onShareAppMessage() {
    return {
      title: this.data.title + ' · NNU技术博客',
      path: '/pages/list/list?type=' + this.data.type + '&name=' + encodeURIComponent(this.data.title)
    };
  }
});
