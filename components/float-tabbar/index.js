Component({
  properties: {
    // 当前选中项：0=首页 1=分类 2=我的
    selected: {
      type: Number,
      value: 0
    }
  },

  data: {
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tab-home.png',
        selectedIconPath: '/images/tab-home-active.png',
        badge: 0
      },
      {
        pagePath: '/pages/categories/categories',
        text: '分类',
        iconPath: '/images/tab-cat.png',
        selectedIconPath: '/images/tab-cat-active.png',
        badge: 0
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/images/tab-me.png',
        selectedIconPath: '/images/tab-me-active.png',
        badge: 0
      }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.list[index].pagePath;
      wx.switchTab({ url: path });
    },

    goSearch() {
      wx.navigateTo({ url: '/pages/search/search' });
    }
  }
});
