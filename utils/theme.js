const themeConfig = require('./theme-config.js');

const Theme = {
  _current: 'light',
  _listeners: [],

  init() {
    try {
      const stored = wx.getStorageSync('theme_mode');
      if (stored === 'dark' || stored === 'light' || stored === 'auto') {
        this._current = stored;
      }
    } catch (e) { /* ignore */ }

    this._applyCurrent();
  },

  // 获取当前设置的mode（light/dark/auto）
  get mode() { return this._current; },

  // 获取当前实际生效的外观（light/dark），处理 auto 的情况
  get effectiveMode() {
    if (this._current === 'auto') {
      return this._detectSystem();
    }
    return this._current;
  },

  get colors() {
    return themeConfig[this.effectiveMode];
  },

  setMode(mode) {
    this._current = mode;
    wx.setStorageSync('theme_mode', mode);
    this._applyCurrent();
    this._notify();
  },

  toggle() {
    const next = this._current === 'dark' ? 'light' : 'dark';
    this.setMode(next);
  },

  _detectSystem() {
    const sys = wx.getSystemInfoSync();
    return sys.theme || 'light';
  },

  _applyCurrent() {
    const effective = this.effectiveMode;
    // 根据实际生效的主题设置页面背景
    if (effective === 'dark') {
      wx.setBackgroundColor({
        backgroundColorTop: '#101214',
        backgroundColorBottom: '#101214',
        backgroundColor: '#101214'
      });
      wx.setBackgroundTextStyle({ textStyle: 'light' });
    } else {
      wx.setBackgroundColor({
        backgroundColorTop: '#F5F7FA',
        backgroundColorBottom: '#F5F7FA',
        backgroundColor: '#F5F7FA'
      });
      wx.setBackgroundTextStyle({ textStyle: 'dark' });
    }
  },

  _notify() {
    const effective = this.effectiveMode;
    this._listeners.forEach(fn => fn(this._current, effective));
  },

  onThemeChange(fn) {
    this._listeners.push(fn);
  },

  // 移除监听
  offThemeChange(fn) {
    const idx = this._listeners.indexOf(fn);
    if (idx > -1) this._listeners.splice(idx, 1);
  }
};

module.exports = Theme;
