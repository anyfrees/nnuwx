Page({
  data: {
    features: [
      { icon: '/images/icons/sync.png', title: '实时同步', desc: '解析 search.xml 自动更新文章' },
      { icon: '/images/icons/search.png', title: '全能搜索', desc: '标题/内容/拼音多维度检索' },
      { icon: '/images/icons/sun.png', title: '浅色模式', desc: '清爽明亮的阅读体验' },
      { icon: '/images/icons/star.png', title: '本地收藏', desc: '无需登录，微信本地收藏' },
      { icon: '/images/icons/mobile.png', title: '分享海报', desc: '一键分享文章到微信朋友圈' },
      { icon: '/images/icons/rocket.png', title: '极致性能', desc: '原生小程序 + 玻璃拟态动效' }
    ],
    links: [
      { label: '个人博客', url: 'https://www.nnu.cn' },
      { label: 'GitHub', url: 'https://github.com/anyfrees' },
      { label: 'RSS 订阅', url: 'https://www.nnu.cn/atom.xml' }
    ]
  },

  copyLink(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
      });
    }
  },

  onShareAppMessage() {
    return {
      title: 'NNU技术博客 · 发现更多精彩文章',
      path: '/pages/index/index'
    };
  }
});
