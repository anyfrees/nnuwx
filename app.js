const { parseXmlFeed } = require('./utils/parser.js');

App({
  globalData: {
    blogUrl: 'https://www.nnu.cn/search.xml',
    articles: [],
    categories: [],
    tags: [],
    theme: 'light',
    // 收藏 (本地存储 key)
    favorites: [],
    // 阅读历史 (本地存储 key)
    history: [],
    // 统计数据
    stats: {
      totalArticles: 0,
      totalViews: 0,
      totalCategories: 0,
      siteStartDate: '2020-01-01'
    }
  },

  onLaunch() {
    // 初始化主题（仅浅色模式）
    this.globalData.theme = 'light';

    // 加载本地收藏
    this.loadFavorites();

    // 加载阅读历史
    this.loadHistory();

    // 加载统计数据
    this.loadStats();

    console.log('NNU技术博客 · ZeroWe 小程序启动');
  },

  // 收藏功能
  loadFavorites() {
    try {
      const favs = wx.getStorageSync('favorites') || [];
      this.globalData.favorites = favs;
    } catch (e) {
      this.globalData.favorites = [];
    }
  },

  isFavorite(articleId) {
    return this.globalData.favorites.some(f => f.id === articleId);
  },

  toggleFavorite(article) {
    const favs = this.globalData.favorites;
    const idx = favs.findIndex(f => f.id === article.id);
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push({
        id: article.id,
        title: article.title,
        coverImage: article.coverImage,
        date: article.date,
        categories: article.categories,
        excerpt: article.excerpt,
        savedAt: new Date().toISOString()
      });
    }
    this.globalData.favorites = favs;
    wx.setStorageSync('favorites', favs);
    return idx === -1; // true = 已收藏, false = 已取消
  },

  // 阅读历史
  loadHistory() {
    try {
      const hist = wx.getStorageSync('history') || [];
      this.globalData.history = hist;
    } catch (e) {
      this.globalData.history = [];
    }
  },

  addHistory(article) {
    let hist = this.globalData.history;
    // 移除重复
    hist = hist.filter(h => h.id !== article.id);
    // 加到最前
    hist.unshift({
      id: article.id,
      title: article.title,
      coverImage: article.coverImage,
      date: article.date,
      categories: article.categories,
      excerpt: article.excerpt,
      readAt: new Date().toISOString()
    });
    // 最多保留 50 条
    if (hist.length > 50) hist = hist.slice(0, 50);
    this.globalData.history = hist;
    wx.setStorageSync('history', hist);
  },

  // 统计数据
  loadStats() {
    try {
      const stats = wx.getStorageSync('stats') || {};
      this.globalData.stats = {
        totalArticles: stats.totalArticles || 0,
        totalViews: stats.totalViews || 0,
        totalCategories: stats.totalCategories || 0,
        siteStartDate: stats.siteStartDate || '2020-01-01'
      };
    } catch (e) { /* ignore */ }
  },

  updateStats(articles, categories) {
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const stats = {
      totalArticles: articles.length,
      totalViews: totalViews,
      totalCategories: categories.length,
      siteStartDate: '2020-01-01'
    };
    this.globalData.stats = stats;
    wx.setStorageSync('stats', stats);
  }
});
