const { parseXmlFeed, fetchArchivesDates, searchArticles, extractCover, FALLBACK_COVERS } = require('../../utils/parser.js');

Page({
  data: {
    // 品牌区
    brandTitle: 'NNU技术博客',
    brandSlogan: 'Life • Share • Technology',

    // 轮播
    banners: [],
    bannerIdx: 0,

    // 分类
    categories: [],
    categoriesAll: [
      { name: '网络运维', icon: '/images/icons/cat-network.png', key: '网络运维' },
      { name: '服务器', icon: '/images/icons/cat-server.png', key: '服务器' },
      { name: 'Docker', icon: '/images/icons/cat-docker.png', key: 'Docker' },
      { name: 'NAS', icon: '/images/icons/cat-nas.png', key: 'NAS' },
      { name: 'Windows', icon: '/images/icons/cat-windows.png', key: 'Windows' },
      { name: '校园信息化', icon: '/images/icons/cat-campus.png', key: '校园信息化' },
      { name: '生活随笔', icon: '/images/icons/cat-life.png', key: '生活随笔' }
    ],

    // 文章列表
    articles: [],
    filteredArticles: [],
    loading: true,
    keyword: '',
    activeCategory: '',
    activeTag: '',

    // 状态栏高度
    statusBarHeight: 20,
    navHeight: 64
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      navHeight: (sys.statusBarHeight || 20) + 44
    });

    const app = getApp();

    // 先加载缓存
    const cached = app.globalData.articles;
    if (cached && cached.length > 0) {
      this.renderArticles(cached, app.globalData.categories || []);
    }

    // 网络拉取
    this.fetchData();
  },

  onShow() {
    // 同步自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }

    const app = getApp();
    if (app.globalData.articles.length > 0) {
      this.renderArticles(app.globalData.articles, app.globalData.categories);
    }
  },

  fetchData() {
    // 优先获取 archives 日期映射
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
              app.updateStats(parsed.articles, parsed.categories);
              this.renderArticles(parsed.articles, parsed.categories);
            }
          }
        },
        fail: (err) => {
          console.warn('XML 拉取失败，使用缓存数据:', err);
          this.setData({ loading: false });
        },
        complete: () => {
          wx.stopPullDownRefresh();
          this.setData({ loading: false });
        }
      });
    }).catch(() => {
      // archives 获取失败，直接解析 XML
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
              app.updateStats(parsed.articles, parsed.categories);
              this.renderArticles(parsed.articles, parsed.categories);
            }
          }
        },
        fail: (err) => {
          console.warn('XML 拉取失败，使用缓存数据:', err);
          this.setData({ loading: false });
        },
        complete: () => {
          wx.stopPullDownRefresh();
          this.setData({ loading: false });
        }
      });
    });
  },

  renderArticles(articles, categories) {
    // 轮播 - 随机选取3篇
    const shuffled = [...articles].sort(() => Math.random() - 0.5);
    const banners = shuffled.slice(0, 3).map((a, i) => ({
      id: a.id,
      title: a.title,
      cover: a.coverImage || FALLBACK_COVERS[i % FALLBACK_COVERS.length],
      category: (a.categories && a.categories[0]) || '推荐'
    }));

    // 匹配已有分类的图标
    const catSet = new Set(categories);
    const cats = this.data.categoriesAll.filter(c => catSet.has(c.key) || categories.includes(c.key));
    
    // 如果没有匹配的分类，使用原始分类生成
    if (cats.length === 0 && categories.length > 0) {
      const iconPool = ['/images/icons/cat-default.png', '/images/icons/cat-tutorial.png', '/images/icons/cat-network.png', '/images/icons/cat-server.png', '/images/icons/cat-docker.png', '/images/icons/cat-nas.png', '/images/icons/cat-campus.png', '/images/icons/cat-life.png'];
      categories.forEach((c, i) => {
        cats.push({ name: c, icon: iconPool[i % iconPool.length], key: c });
      });
    }

    this.setData({
      articles: articles,
      filteredArticles: articles,
      banners: banners,
      categories: cats,
      loading: false
    });
  },

  // 搜索跳转
  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // 轮播切换
  onBannerChange(e) {
    this.setData({ bannerIdx: e.detail.current });
  },

  // 点击轮播
  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  // 点击分类
  onCategoryTap(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === '全部') {
      this.applyFilter('', '');
      return;
    }
    // 直接在当前页面过滤，不再通过 switchTab（解决某些微信版本 switchTab 到当前 tab 不触发 onShow 的问题）
    this.applyFilter(cat, '');
  },

  // 应用分类/标签过滤
  applyFilter(cat, tag) {
    let list = this.data.articles;
    if (cat) {
      list = list.filter(a => a.categories && a.categories.includes(cat));
    } else if (tag) {
      list = list.filter(a => a.tags && a.tags.includes(tag));
    }
    this.setData({
      filteredArticles: list,
      activeCategory: cat || '',
      activeTag: tag || ''
    });
  },

  // 点击文章
  onArticleTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ loading: true });
    this.fetchData();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'NNU技术博客 · 发现更多精彩文章',
      path: '/pages/index/index'
    };
  }
});
