Component({
  properties: {
    // 导航栏标题
    title: {
      type: String,
      value: 'NNU技术博客'
    },
    // 透明模式：无背景、无模糊、白色文字，用于沉浸式 Hero 页面
    transparent: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusBarHeight: 20,
    navHeight: 64
  },

  lifetimes: {
    attached() {
      let statusBarHeight = 20;
      let navContentHeight = 44;
      try {
        const sys = wx.getSystemInfoSync();
        statusBarHeight = sys.statusBarHeight || 20;
        // 胶囊按钮区域高度（iOS 44，Android 约 48，这里统一用 44 内容区）
        navContentHeight = (sys.statusBarHeight || 20) >= 44 ? 44 : 48;
      } catch (e) {
        // 忽略异常，使用默认值
      }
      this.setData({
        statusBarHeight: statusBarHeight,
        navHeight: statusBarHeight + navContentHeight
      });
    }
  }
});
