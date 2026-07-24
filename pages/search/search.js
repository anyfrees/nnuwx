const { searchArticles, parseXmlFeed, fetchArchivesDates } = require('../../utils/parser.js');

Page({
  data: {
    keyword: '',
    articles: [],
    results: [],
    searchDone: false,
    hotTags: ['Docker', 'NAS', 'Xibo', 'RustDesk', '运维', '部署', '教程'],
    searchHistory: []
  },

  onLoad() {
    const app = getApp();
    const articles = app.globalData.articles || [];
    this.setData({ articles });

    // 加载搜索历史
    try {
      const hist = wx.getStorageSync('search_keywords') || [];
      this.setData({ searchHistory: hist.slice(0, 10) });
    } catch (e) { /* ignore */ }

    // 如果还没拉取数据，尝试拉取
    if (articles.length === 0) {
      this.fetchArticles();
    }
  },

  onShow() {
  },

  fetchArticles() {
    fetchArchivesDates().then(dateMap => {
      wx.request({
        url: 'https://www.nnu.cn/search.xml',
        method: 'GET',
        timeout: 8000,
        success: (res) => {
          if (res.statusCode === 200 && res.data && typeof res.data === 'string') {
            const parsed = parseXmlFeed(res.data, dateMap);
            if (parsed.articles && parsed.articles.length > 0) {
              const app = getApp();
              app.globalData.articles = parsed.articles;
              app.globalData.categories = parsed.categories;
              app.globalData.tags = parsed.tags;
              this.setData({ articles: parsed.articles });
              if (this.data.keyword) {
                this.doSearch();
              }
            }
          }
        }
      });
    }).catch(() => {
      wx.request({
        url: 'https://www.nnu.cn/search.xml',
        method: 'GET',
        timeout: 8000,
        success: (res) => {
          if (res.statusCode === 200 && res.data && typeof res.data === 'string') {
            const parsed = parseXmlFeed(res.data);
            if (parsed.articles && parsed.articles.length > 0) {
              const app = getApp();
              app.globalData.articles = parsed.articles;
              app.globalData.categories = parsed.categories;
              app.globalData.tags = parsed.tags;
              this.setData({ articles: parsed.articles });
              if (this.data.keyword) {
                this.doSearch();
              }
            }
          }
        }
      });
    });
  },

  onInput(e) {
    const kw = e.detail.value;
    this.setData({ keyword: kw });
    if (kw.trim()) {
      this.doSearch(kw);
    } else {
      this.setData({ results: [], searchDone: false });
    }
  },

  onClear() {
    this.setData({ keyword: '', results: [], searchDone: false });
  },

  doSearch(keywordOverride) {
    const kw = (keywordOverride || this.data.keyword).trim();
    if (!kw) return;

    const articles = this.data.articles;
    if (articles.length === 0) {
      this.fetchArticles();
      return;
    }

    const results = searchArticles(articles, kw);
    this.setData({
      results: results,
      searchDone: true
    });

    // 保存搜索历史
    this.saveHistory(kw);
  },

  onSearch() {
    this.doSearch();
  },

  saveHistory(kw) {
    let hist = this.data.searchHistory;
    hist = hist.filter(h => h !== kw);
    hist.unshift(kw);
    if (hist.length > 10) hist = hist.slice(0, 10);
    this.setData({ searchHistory: hist });
    wx.setStorageSync('search_keywords', hist);
  },

  onTagTap(e) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.doSearch(kw);
  },

  onHistoryTap(e) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.doSearch(kw);
  },

  clearHistory() {
    this.setData({ searchHistory: [] });
    wx.setStorageSync('search_keywords', []);
  },

  onArticleTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  }
});
