const { parseXmlFeed, fetchArchivesDates, searchArticles, extractCover, FALLBACK_COVERS } = require('../../utils/parser.js');

// 动态分类风格池：形状、渐变、图标按顺序轮循分配
const SHAPE_POOL = ['circle-bg', 'hex-bg', 'square-bg', 'round-bg', 'poly-bg', 'bubble-bg'];
const GRADIENT_POOL = ['blue-gradient', 'purple-gradient', 'cyan-gradient', 'orange-gradient', 'coral-gradient', 'teal-gradient', 'pink-gradient', 'gray-gradient'];
const ICON_POOL = [
  '/images/icons/cat-network.png',
  '/images/icons/cat-server.png',
  '/images/icons/cat-docker.png',
  '/images/icons/cat-nas.png',
  '/images/icons/cat-windows.png',
  '/images/icons/cat-campus.png',
  '/images/icons/cat-life.png',
  '/images/icons/cat-default.png'
];

// 预设分类名称 → 风格映射（已知分类保留专属图标/配色）
const CATEGORY_STYLE_PRESETS = {
  '网络运维':   { icon: '/images/icons/cat-network.png', shape: 'hex-bg',    gradient: 'blue-gradient' },
  '服务器':     { icon: '/images/icons/cat-server.png',  shape: 'square-bg',  gradient: 'purple-gradient' },
  'Docker':     { icon: '/images/icons/cat-docker.png',  shape: 'round-bg',   gradient: 'cyan-gradient' },
  'NAS':        { icon: '/images/icons/cat-nas.png',     shape: 'poly-bg',    gradient: 'orange-gradient' },
  'Windows':    { icon: '/images/icons/cat-windows.png', shape: 'square-bg',  gradient: 'teal-gradient' },
  '校园信息化': { icon: '/images/icons/cat-campus.png', shape: 'bubble-bg',  gradient: 'coral-gradient' },
  '生活随笔':   { icon: '/images/icons/cat-life.png',    shape: 'circle-bg',  gradient: 'pink-gradient' }
};

Page({
  data: {
    // 轮播 (保留用于兼容)
    banners: [],
    bannerIdx: 0,

    // 精选文章轮播（右侧大卡片，3篇动态滚动）
    featuredArticles: [],
    featuredSwiperIdx: 0,

    // 左侧两个卡片：随机栏目名称动态展示
    leftTopCard: { name: '加载中', count: 0 },
    leftBottomCard: { name: '加载中', count: 0 },

    // 统计
    stats: {
      totalArticles: 0,
      totalViews: 0,
      totalCategories: 0
    },

    // 分类 — 完全由博客数据动态生成
    categories: [],
    categoriesWithStyle: [],

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

    // 同步统计
    this.setData({
      stats: app.globalData.stats || { totalArticles: 0, totalViews: 0, totalCategories: 0 }
    });

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

    // 同步统计
    this.setData({
      stats: app.globalData.stats || { totalArticles: 0, totalViews: 0, totalCategories: 0 }
    });

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
              this.setData({
                stats: app.globalData.stats || { totalArticles: 0, totalViews: 0, totalCategories: 0 }
              });
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
              this.setData({
                stats: app.globalData.stats || { totalArticles: 0, totalViews: 0, totalCategories: 0 }
              });
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

  /**
   * 为分类名动态分配风格：优先命中预设，否则按索引轮循池子
   */
  assignCategoryStyle(catName, index) {
    if (CATEGORY_STYLE_PRESETS[catName]) {
      return CATEGORY_STYLE_PRESETS[catName];
    }
    return {
      icon: ICON_POOL[index % ICON_POOL.length],
      shape: SHAPE_POOL[index % SHAPE_POOL.length],
      gradient: GRADIENT_POOL[index % GRADIENT_POOL.length]
    };
  },

  /**
   * 从分类中按文章数统计，挑2个随机的作为左侧卡片展示
   */
  pickRandomLeftCards(articles, categories) {
    // 统计每个分类的文章数
    const catCountMap = {};
    categories.forEach(c => { catCountMap[c] = 0; });
    articles.forEach(a => {
      if (a.categories) {
        a.categories.forEach(c => {
          if (catCountMap[c] !== undefined) catCountMap[c]++;
        });
      }
    });

    const catList = categories.map(name => ({ name, count: catCountMap[name] || 0 }));
    // 随机打乱取前2个
    const shuffled = [...catList].sort(() => Math.random() - 0.5);
    const top = shuffled[0] || { name: '全部分类', count: articles.length };
    const bottom = shuffled[1] || { name: '最新文章', count: articles.length };
    return { leftTopCard: top, leftBottomCard: bottom };
  },

  renderArticles(articles, categories) {
    // 精选文章轮播（右侧大卡片）：随机选取3篇有封面的
    const withCover = articles.filter(a => a.coverImage && a.coverImage.startsWith('http'));
    const pool = withCover.length >= 3 ? withCover : articles;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const featuredArticles = shuffled.slice(0, 3).map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      coverImage: a.coverImage || FALLBACK_COVERS[0],
      category: (a.categories && a.categories[0]) || '精选'
    }));

    // 轮播（兼容旧 banner）
    const banners = featuredArticles.map((a, i) => ({
      id: a.id,
      title: a.title,
      cover: a.coverImage || FALLBACK_COVERS[i % FALLBACK_COVERS.length],
      category: a.category
    }));

    // 动态生成 categoriesWithStyle — 完全由博客实际分类驱动
    const cats = categories.map((name, i) => {
      const style = this.assignCategoryStyle(name, i);
      return { name, key: name, icon: style.icon, shape: style.shape, gradient: style.gradient };
    });

    // 左侧两个卡片随机栏目
    const { leftTopCard, leftBottomCard } = this.pickRandomLeftCards(articles, categories);

    this.setData({
      articles: articles,
      filteredArticles: articles,
      banners: banners,
      featuredArticles: featuredArticles,
      categories: cats,
      categoriesWithStyle: cats,
      leftTopCard: leftTopCard,
      leftBottomCard: leftBottomCard,
      loading: false
    });
  },

  // 搜索跳转
  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // 跳转个人页
  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
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

  // 精选文章 swiper 切换
  onFeaturedSwiperChange(e) {
    this.setData({ featuredSwiperIdx: e.detail.current });
  },

  // 点击精选文章
  onFeaturedTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  // 点击左侧上方卡片
  onLeftTopTap() {
    const cat = this.data.leftTopCard.name;
    if (cat && cat !== '加载中' && cat !== '全部分类') {
      this.onCategoryTap({ currentTarget: { dataset: { cat: cat } } });
    }
  },

  // 点击左侧下方卡片
  onLeftBottomTap() {
    const cat = this.data.leftBottomCard.name;
    if (cat && cat !== '加载中' && cat !== '最新文章') {
      this.onCategoryTap({ currentTarget: { dataset: { cat: cat } } });
    }
  },

  // 快捷入口
  onQuickLink(e) {
    const type = e.currentTarget.dataset.type;
    switch (type) {
      case 'github':
        wx.setClipboardData({ data: 'https://github.com/' });
        wx.showToast({ title: 'GitHub 链接已复制', icon: 'none' });
        break;
      case 'rss':
        wx.setClipboardData({ data: 'https://www.nnu.cn/atom.xml' });
        wx.showToast({ title: 'RSS 链接已复制', icon: 'none' });
        break;
      case 'about':
        wx.navigateTo({ url: '/pages/about/about' });
        break;
      default:
        break;
    }
  },

  // 点击分类
  onCategoryTap(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === '全部') {
      this.applyFilter('', '');
      return;
    }
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
