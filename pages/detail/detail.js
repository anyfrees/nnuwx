Page({
  data: {
    article: null
  },

  onLoad(options) {
    const id = options ? options.id : '';
    const app = getApp();
    const articles = (app && app.globalData && app.globalData.articles) ? app.globalData.articles : [];
    
    let art = articles.find(a => a.id === id);
    if (!art && articles.length > 0) {
      art = articles[0];
    }

    if (art) {
      // 保证图片在 rich-text 中居中并限制最大宽度
      let formattedContent = art.content || '';
      if (formattedContent && !formattedContent.includes('style=')) {
        formattedContent = formattedContent.replace(/<img\b([^>]*)>/gi, '<img $1 style="max-width:100%!important;height:auto!important;display:block;margin:24rpx auto;border-radius:16rpx;" />');
      }

      this.setData({
        article: {
          ...art,
          content: formattedContent
        }
      });
    }
  },

  onShareAppMessage() {
    const art = this.data.article;
    return {
      title: art ? art.title : 'NNU 博客精选文章',
      path: '/pages/detail/detail?id=' + (art ? art.id : '')
    };
  }
});