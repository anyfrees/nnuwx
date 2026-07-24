Page({
  data: {
    categories: [],
    tags: [],
    activeTab: 'category',
    catIcons: {
      'Docker': '/images/icons/cat-docker.png', 'Windows': '/images/icons/cat-windows.png', 'NAS': '/images/icons/cat-nas.png', '网络运维': '/images/icons/cat-network.png',
      '服务器': '/images/icons/cat-server.png', '校园信息化': '/images/icons/cat-campus.png', '生活随笔': '/images/icons/cat-life.png', '教程': '/images/icons/cat-tutorial.png',
      '资料': '/images/icons/cat-default.png', '服务部署': '/images/icons/cat-server.png', '前端开发': '/images/icons/cat-default.png', 'AI应用': '/images/icons/cat-default.png',
      '深度学习': '/images/icons/cat-default.png', '摄影': '/images/icons/cat-life.png', '数码': '/images/icons/cat-mobile.png', 'Linux': '/images/icons/cat-server.png',
      '运维': '/images/icons/cat-network.png', '安全': '/images/icons/cat-default.png', '数据库': '/images/icons/cat-nas.png', '容器化': '/images/icons/cat-docker.png'
    }
  },

  onShow() {
    // 同步自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }

    const app = getApp();
    const cats = app.globalData.categories || [];
    const tags = app.globalData.tags || [];

    // 为分类匹配图标
    const categories = cats.map(c => ({
      name: c,
      icon: this.data.catIcons[c] || this.getDefaultIcon(c),
      count: this.countByCategory(app.globalData.articles, c)
    }));

    this.setData({ categories, tags });
  },

  countByCategory(articles, cat) {
    if (!articles) return 0;
    return articles.filter(a => a.categories && a.categories.includes(cat)).length;
  },

  getDefaultIcon(name) {
    const icons = ['/images/icons/cat-default.png', '/images/icons/cat-tutorial.png', '/images/icons/cat-network.png', '/images/icons/cat-server.png', '/images/icons/cat-docker.png', '/images/icons/cat-nas.png', '/images/icons/cat-campus.png', '/images/icons/cat-life.png'];
    let hash = 0;
    for (let ch of name) { hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff; }
    return icons[hash % icons.length];
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onCategoryTap(e) {
    const name = e.currentTarget.dataset.name;
    const icon = e.currentTarget.dataset.icon || '';
    wx.navigateTo({
      url: '/pages/list/list?type=category&name=' + encodeURIComponent(name) + '&icon=' + encodeURIComponent(icon)
    });
  },

  onTagTap(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: '/pages/list/list?type=tag&name=' + encodeURIComponent(name)
    });
  }
});
