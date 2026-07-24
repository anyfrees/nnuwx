const { stripHtml, FALLBACK_COVERS } = require('../../utils/parser.js');

Page({
  data: {
    article: null,
    isFavorite: false,
    formattedContent: '',
    relatedArticles: [],
    showSharePanel: false,
    showBackTop: false
  },

  onLoad(options) {
    const id = options ? options.id : '';
    const app = getApp();
    const articles = app.globalData.articles || [];

    let art = articles.find(a => a.id === id);
    if (!art && articles.length > 0) {
      art = articles[0];
    }

    if (!art) {
      wx.showToast({ title: '文章未找到', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 记录阅读历史
    app.addHistory(art);

    // 检查收藏状态
    const isFav = app.isFavorite(art.id);

    // 格式化内容
    let html = this.formatContent(art.content || '');

    // 相关文章推荐
    const related = this.getRelatedArticles(articles, art);

    // 补充元数据字段
    const wordCount = art.wordCount || 0;
    const enrichedArticle = {
      ...art,
      wordCountStr: this.formatWordCount(wordCount),
      readTime: art.readTime || Math.max(1, Math.ceil(wordCount / 500)),
      location: art.location || 'China',
      commentCount: art.commentCount || 0,
      updatedDate: art.updatedDate || art.date || ''
    };

    this.setData({
      article: enrichedArticle,
      isFavorite: isFav,
      formattedContent: html,
      relatedArticles: related
    });

    // 重新设置导航标题
    wx.setNavigationBarTitle({ title: (art.title || '').slice(0, 12) || '文章详情' });

    // 监听页面滚动以控制返回顶部按钮
    this._scrollHandler = () => {
      const query = wx.createSelectorQuery();
      query.select('.article-header').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          const heroBottom = res[0].bottom;
          // Hero 区域滚出视口 60% 后显示返回顶部
          const shouldShow = heroBottom < (res[0].height * 0.4) * -1;
          if (shouldShow !== this.data.showBackTop) {
            this.setData({ showBackTop: shouldShow });
          }
        }
      });
    };
  },

  formatContent(rawHtml) {
    if (!rawHtml) return '<p style="color:#999;">暂无内容</p>';

    let html = rawHtml;

    // 解码 HTML 实体
    html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
               .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&');

    // 处理代码块：用 pre/code 包裹
    html = html.replace(/<figure class="highlight (\w+)">/g, '<div class="code-block" data-lang="$1"><pre><code>');
    html = html.replace(/<\/figure>/g, '</code></pre></div>');

    // 确保 img 标签响应式
    html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
      return `<img ${attrs} style="max-width:100%;height:auto;display:block;margin:16rpx auto;border-radius:12rpx;" />`;
    });

    // 处理表格
    html = html.replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;margin:20rpx 0;">');
    html = html.replace(/<td>/g, '<td style="border:1px solid #e2e8f0;padding:12rpx 16rpx;">');
    html = html.replace(/<th>/g, '<th style="border:1px solid #e2e8f0;padding:12rpx 16rpx;background:#f8fafc;font-weight:600;">');

    // 处理引用
    html = html.replace(/<blockquote>/g, '<blockquote style="border-left:4rpx solid #1677FF;padding:16rpx 24rpx;margin:20rpx 0;background:rgba(22,119,255,0.04);border-radius:0 12rpx 12rpx 0;">');

    // 确保标题有样式
    html = html.replace(/<h1/g, '<h1 style="font-size:40rpx;font-weight:800;margin:32rpx 0 16rpx;color:#1a1a2e;"');
    html = html.replace(/<h2/g, '<h2 style="font-size:36rpx;font-weight:700;margin:28rpx 0 14rpx;color:#1a1a2e;"');
    html = html.replace(/<h3/g, '<h3 style="font-size:32rpx;font-weight:600;margin:24rpx 0 12rpx;color:#1a1a2e;"');

    // 段落样式
    html = html.replace(/<p>/g, '<p style="margin:16rpx 0;line-height:1.8;">');

    // 链接
    html = html.replace(/<a\b/g, '<a style="color:#1677FF;text-decoration:none;"');

    // 列表样式
    html = html.replace(/<li>/g, '<li style="margin:8rpx 0;line-height:1.6;">');

    return html;
  },

  getRelatedArticles(articles, current) {
    if (!articles || articles.length <= 1) return [];

    const currentCats = current.categories || [];
    const currentTags = current.tags || [];

    return articles
      .filter(a => a.id !== current.id)
      .map(a => {
        let score = 0;
        const aCats = a.categories || [];
        const aTags = a.tags || [];

        // 同分类加分
        currentCats.forEach(c => { if (aCats.includes(c)) score += 3; });
        // 同标签加分
        currentTags.forEach(t => { if (aTags.includes(t)) score += 2; });

        return { ...a, score };
      })
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  },

  // 收藏切换
  toggleFavorite() {
    const app = getApp();
    const art = this.data.article;
    if (!art) return;

    const added = app.toggleFavorite(art);

    this.setData({ isFavorite: added });

    wx.showToast({
      title: added ? '已收藏 ★' : '已取消收藏',
      icon: 'none',
      duration: 1500
    });

    // 触觉反馈
    wx.vibrateShort({ type: 'light' });
  },

  // 分享
  onShareAppMessage() {
    const art = this.data.article;
    return {
      title: art ? art.title : 'NNU技术博客 · 精彩文章',
      path: '/pages/detail/detail?id=' + (art ? art.id : ''),
      imageUrl: art ? art.coverImage : ''
    };
  },

  // 分享面板
  toggleSharePanel() {
    this.setData({ showSharePanel: !this.data.showSharePanel });
  },

  // 复制链接
  copyLink() {
    const art = this.data.article;
    if (!art) return;
    const url = art.url || ('https://www.nnu.cn' + (art.url || ''));
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
    this.setData({ showSharePanel: false });
  },

  // 评论跳转
  goComment() {
    const art = this.data.article;
    if (!art) return;
    const url = art.url || '';
    if (url && url !== '#') {
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({ title: '链接已复制，请在浏览器打开查看评论', icon: 'none', duration: 2000 });
        }
      });
    } else {
      wx.showToast({ title: '暂无评论链接', icon: 'none' });
    }
  },

  // 点击相关文章
  onRelatedTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.redirectTo({ url: '/pages/detail/detail?id=' + id });
    }
  },

  // 图片预览 - 通过捕获 rich-text 中的点击实现
  // 由于 rich-text 不直接支持事件，我们在内容外添加提示
  previewImageHint() {
    wx.showToast({ title: '长按图片可保存或转发', icon: 'none' });
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 格式化字数（如 1300 → "1.3k"）
  formatWordCount(count) {
    if (!count || count === 0) return '0 字';
    if (count >= 1000) {
      const k = (count / 1000).toFixed(1).replace(/\.0$/, '');
      return k + 'k 字';
    }
    return count + ' 字';
  },

  // 返回顶部
  scrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 350
    });
  },

  // 页面滚动监听
  onPageScroll() {
    if (this._scrollHandler) {
      this._scrollHandler();
    }
  },

  // 页面卸载清理
  onUnload() {
    this._scrollHandler = null;
  }
});
