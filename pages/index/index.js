const rssUtil = require('../../utils/rss.js');

Page({
  data: {
    articles: [],
    filteredArticles: [],
    categories: [],
    currentCategory: '全部',
    currentTag: null,
    keyword: '',
    feedUrl: 'https://www.nnu.cn/search.xml'
  },

  onLoad(options) {
    const app = getApp();
    let catParam = '全部';
    let tagParam = null;

    if (options && options.cat) {
      catParam = decodeURIComponent(options.cat);
    } else if (app && app.globalData && app.globalData.selectedCategory) {
      catParam = app.globalData.selectedCategory;
      app.globalData.selectedCategory = null;
    }

    if (options && options.tag) {
      tagParam = decodeURIComponent(options.tag);
    } else if (app && app.globalData && app.globalData.selectedTag) {
      tagParam = app.globalData.selectedTag;
      app.globalData.selectedTag = null;
    }

    const defaultArticles = (app && app.globalData && app.globalData.articles && app.globalData.articles.length > 0) 
      ? app.globalData.articles 
      : [];

    const defaultCategories = (app && app.globalData && app.globalData.categories) ? app.globalData.categories : [];

    this.setData({
      articles: defaultArticles,
      categories: defaultCategories,
      currentCategory: catParam,
      currentTag: tagParam
    });

    this.filterArticles(this.data.keyword, catParam, tagParam);

    // 尝试网络拉取最新 XML Feed
    this.fetchArticles();
  },

  onShow() {
    const app = getApp();
    if (app && app.globalData) {
      let updatedCat = this.data.currentCategory;
      let updatedTag = this.data.currentTag;

      if (app.globalData.selectedCategory) {
        updatedCat = app.globalData.selectedCategory;
        updatedTag = null;
        app.globalData.selectedCategory = null;
      }

      if (app.globalData.selectedTag) {
        updatedTag = app.globalData.selectedTag;
        updatedCat = '全部';
        app.globalData.selectedTag = null;
      }

      const list = (app.globalData.articles && app.globalData.articles.length > 0) ? app.globalData.articles : this.data.articles;

      this.setData({
        articles: list,
        categories: app.globalData.categories || this.data.categories,
        currentCategory: updatedCat,
        currentTag: updatedTag
      });

      this.filterArticles(this.data.keyword, updatedCat, updatedTag);
    }
  },

  fetchArticles() {
    wx.request({
      url: this.data.feedUrl,
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        if (res.statusCode === 200 && res.data && typeof res.data === 'string' && (res.data.includes('<') || res.data.includes('<rss') || res.data.includes('<feed'))) {
          const parsed = rssUtil.parseXmlFeed(res.data);
          if (parsed.articles && parsed.articles.length > 0) {
            this.setData({
              articles: parsed.articles,
              categories: parsed.categories
            });

            const app = getApp();
            if (app && app.globalData) {
              app.globalData.articles = parsed.articles;
              app.globalData.categories = parsed.categories;
              app.globalData.tags = parsed.tags;
            }

            this.filterArticles(this.data.keyword, this.data.currentCategory, this.data.currentTag);
          }
        }
      },
      fail: (err) => {
        console.warn('远程 XML RSS 请求超时，已流畅渲染预置文章内容:', err);
      },
      complete: () => {
        wx.stopPullDownRefresh();
      }
    });
  },

  onSearchInput(e) {
    const kw = e.detail.value ? e.detail.value.toLowerCase() : '';
    this.setData({ keyword: kw });
    this.filterArticles(kw, this.data.currentCategory, this.data.currentTag);
  },

  clearSearch() {
    this.setData({ keyword: '' });
    this.filterArticles('', this.data.currentCategory, this.data.currentTag);
  },

  selectCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({
      currentCategory: cat,
      currentTag: null
    });
    this.filterArticles(this.data.keyword, cat, null);
  },

  clearAllFilters() {
    this.setData({
      currentCategory: '全部',
      currentTag: null,
      keyword: ''
    });
    this.filterArticles('', '全部', null);
  },

  filterArticles(kw, cat, tag) {
    let list = this.data.articles || [];

    if (cat && cat !== '全部') {
      list = list.filter(a => a.categories && a.categories.includes(cat));
    }

    if (tag) {
      list = list.filter(a => a.tags && a.tags.includes(tag));
    }

    if (kw) {
      list = list.filter(a => 
        (a.title && a.title.toLowerCase().includes(kw)) || 
        (a.excerpt && a.excerpt.toLowerCase().includes(kw)) ||
        (a.content && a.content.toLowerCase().includes(kw))
      );
    }

    this.setData({ filteredArticles: list });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: '/pages/detail/detail?id=' + id
      });
    }
  },

  onPullDownRefresh() {
    this.fetchArticles();
  }
});