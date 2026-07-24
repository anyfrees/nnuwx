// XML Feed 解析器 - 从 search.xml 提取文章
const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
  'https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&q=80',
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80'
];

// HTML 实体解码
function decodeEntities(str) {
  if (!str) return '';
  const entities = {
    '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&apos;': "'", '&nbsp;': ' ', '&amp;': '&',
    '&#x2F;': '/', '&#x3D;': '=', '&#x60;': '`'
  };
  return str.replace(/&[#a-zA-Z0-9]+;/g, m => entities[m] || m);
}

// 剥离 HTML 标签
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// 提取封面图
function extractCover(html, index) {
  if (!html) return FALLBACK_COVERS[index % FALLBACK_COVERS.length];
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    // 处理协议相对 URL
    let src = imgMatch[1];
    if (src.startsWith('//')) src = 'https:' + src;
    return src;
  }
  return FALLBACK_COVERS[index % FALLBACK_COVERS.length];
}

// 提取文章摘要（去除 Markdown 标记）
function extractExcerpt(html, maxLen) {
  maxLen = maxLen || 140;
  let text = stripHtml(html);
  // 去掉 Markdown 标记符号
  text = text.replace(/[#*`>\[\]()!_~|]/g, '');
  if (text.length > maxLen) text = text.slice(0, maxLen) + '...';
  return text || '暂无摘要';
}

// 格式化日期
function formatDate(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) { /* ignore */ }
  // 尝试匹配 YYYY-MM-DD
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  return raw.slice(0, 10) || '';
}

// 从 archives 页面抓取文章日期映射
function fetchArchivesDates() {
  return new Promise((resolve) => {
    wx.request({
      url: 'https://www.nnu.cn/archives/',
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const dateMap = {};
        if (res.statusCode === 200 && res.data && typeof res.data === 'string') {
          // 匹配 <article-sort-item-title" href="/post/xxx.html" 和紧随其后的 <time ... title="发表于 YYYY-MM-DD">
          const itemRegex = /article-sort-item-title"\s+href="([^"]+)"[\s\S]*?title="发表于\s+(\d{4}-\d{2}-\d{2})/gi;
          let m;
          while ((m = itemRegex.exec(res.data)) !== null) {
            const urlPath = m[1];
            const dateStr = m[2];
            if (urlPath && dateStr) {
              dateMap[urlPath] = dateStr;
            }
          }
          // 也尝试匹配 datetime 属性
          const timeRegex = /article-sort-item-title"\s+href="([^"]+)"[\s\S]*?datetime="([^"]+)"/gi;
          let m2;
          while ((m2 = timeRegex.exec(res.data)) !== null) {
            const urlPath = m2[1];
            const dateTime = m2[2];
            if (urlPath && dateTime && !dateMap[urlPath]) {
              dateMap[urlPath] = formatDate(dateTime);
            }
          }
        }
        resolve(dateMap);
      },
      fail: () => resolve({})
    });
  });
}

// 主解析函数
function parseXmlFeed(xmlText, dateMap) {
  if (!xmlText || typeof xmlText !== 'string') {
    return { articles: [], categories: [], tags: [] };
  }
  
  dateMap = dateMap || {};

  // 剥离 CDATA
  let cleanXml = xmlText.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, (_, p1) => p1);

  const articles = [];
  const categoriesSet = new Set();
  const tagsSet = new Set();

  // 匹配 <entry> 节点
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  let idx = 0;

  while ((match = entryRegex.exec(cleanXml)) !== null) {
    const entryXml = match[1];

    // 标题
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? decodeEntities(stripHtml(titleMatch[1].trim())) : '无标题';

    // URL
    let url = '#';
    const urlMatch = entryXml.match(/<url[^>]*>([\s\S]*?)<\/url>/i);
    if (urlMatch) {
      url = urlMatch[1].trim();
      if (!url.startsWith('http')) url = 'https://www.nnu.cn' + (url.startsWith('/') ? '' : '/') + url;
    }

    // 内容
    const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    let rawContent = contentMatch ? contentMatch[1].trim() : '';
    let plainContent = stripHtml(rawContent);

    // 分类
    const articleCategories = [];
    const catRegex = /<category[^>]*>([\s\S]*?)<\/category>/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(entryXml)) !== null) {
      let catName = catMatch[1].trim();
      if (catName) {
        articleCategories.push(catName);
        categoriesSet.add(catName);
      }
    }

    // 标签 - 只在独立的 <tags> 块中匹配，避免匹配到文章 HTML 内容中的 <tag> 字面文本
    const articleTags = [];
    const tagsBlockMatch = entryXml.match(/<tags>([\s\S]*?)<\/tags>/i);
    if (tagsBlockMatch) {
      const tagRegex = /<tag[^>]*>([\s\S]*?)<\/tag>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(tagsBlockMatch[1])) !== null) {
        let tagName = tagMatch[1].trim();
        if (tagName) {
          articleTags.push(tagName);
          tagsSet.add(tagName);
        }
      }
    }

    // 日期 - 优先从 dedicated date 字段提取，再从 archives 页面映射提取
    let date = '';
    const publishedMatch = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
    const updatedMatch = entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const pubDateMatch = entryXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    let rawDate = '';
    if (publishedMatch) rawDate = publishedMatch[1].trim();
    else if (updatedMatch) rawDate = updatedMatch[1].trim();
    else if (pubDateMatch) rawDate = pubDateMatch[1].trim();
    if (rawDate) {
      date = formatDate(rawDate);
    }
    // 从 archives 日期映射表中查找（需要匹配相对路径）
    if (!date && dateMap[url]) {
      date = dateMap[url];
    }
    // 也尝试用完整 URL 中的路径匹配
    if (!date) {
      const urlPath = url.replace(/^https?:\/\/[^\/]+/, '');
      if (urlPath && dateMap[urlPath]) {
        date = dateMap[urlPath];
      }
    }
    // 最后兜底：从 URL 中提取日期
    if (!date) {
      const urlDateMatch = url.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
      if (urlDateMatch) date = urlDateMatch[0];
    }

    const article = {
      id: 'art_' + idx,
      title: title,
      url: url,
      excerpt: extractExcerpt(rawContent),
      content: rawContent,  // 原始 HTML 内容
      categories: articleCategories.length ? articleCategories : ['未分类'],
      tags: articleTags,
      date: date,
      coverImage: extractCover(rawContent, idx),
      views: Math.floor(Math.random() * 800) + 120,
      likes: Math.floor(Math.random() * 90) + 10,
      readTime: Math.max(1, Math.ceil(plainContent.length / 500)),
      wordCount: plainContent.length,
      author: 'Any Free'
    };

    articles.push(article);
    idx++;
  }

  return {
    articles,
    categories: Array.from(categoriesSet),
    tags: Array.from(tagsSet)
  };
}

// 拼音映射表（简化版）
const PINYIN_MAP = {
  '网': 'wang', '络': 'luo', '运': 'yun', '维': 'wei', '服': 'fu', '务': 'wu',
  '器': 'qi', '部': 'bu', '署': 'shu', '教': 'jiao', '程': 'cheng', '校': 'xiao',
  '园': 'yuan', '信': 'xin', '息': 'xi', '化': 'hua', '生': 'sheng', '活': 'huo',
  '随': 'sui', '笔': 'bi', '资': 'zi', '料': 'liao', '开': 'kai', '发': 'fa',
  '系': 'xi', '统': 'tong', '安': 'an', '全': 'quan', '数': 'shu', '据': 'ju',
  '库': 'ku', '码': 'ma', '源': 'yuan', '代': 'dai', '深': 'shen', '度': 'du',
  '学': 'xue', '习': 'xi', '前': 'qian', '端': 'duan', '后': 'hou', '技': 'ji',
  '术': 'shu', '实': 'shi', '战': 'zhan', '指': 'zhi', '南': 'nan', '测': 'ce',
  '试': 'shi', '压': 'ya', '力': 'li', '解': 'jie', '除': 'chu', '密': 'mi',
  '码': 'ma', '修': 'xiu', '改': 'gai', '默': 'mo', '认': 'ren', '移': 'yi',
  '动': 'dong', '设': 'she', '备': 'bei', '管': 'guan', '理': 'li', '释': 'shi',
  '放': 'fang', '媒': 'mei', '体': 'ti', '信': 'xin', '发': 'fa', '布': 'bu',
  '并': 'bing', '压': 'ya', '测': 'ce', '忘': 'wang', '记': 'ji', '种': 'zhong',
  '容': 'rong', '器': 'qi', '脚': 'jiao', '本': 'ben', '编': 'bian', '排': 'pai',
  '搜': 'sou', '索': 'suo', '基': 'ji', '础': 'chu', '详': 'xiang', '细': 'xi',
  '架': 'jia', '构': 'gou', '简': 'jian', '介': 'jie', '准': 'zhun', '备': 'bei',
  '配': 'pei', '置': 'zhi', '文': 'wen', '件': 'jian', '启': 'qi', '动': 'dong',
  '初': 'chu', '始': 'shi', '密': 'mi', '访': 'fang', '问': 'wen', '终': 'zhong',
  '客': 'ke', '户': 'hu', '使': 'shi', '用': 'yong', '流': 'liu', '程': 'cheng',
  '推': 'tui', '荐': 'jian', '方': 'fang', '式': 'shi', '环': 'huan', '境': 'jing',
  '链': 'lian', '接': 'jie', '共': 'gong', '享': 'xiang', '注': 'zhu', '意': 'yi',
  '选': 'xuan', '项': 'xiang', '导': 'dao', '入': 'ru', '出': 'chu', '版': 'ban',
  '本': 'ben', '控': 'kong', '制': 'zhi', '提': 'ti', '供': 'gong', '支': 'zhi',
  '持': 'chi', '格': 'ge', '式': 'shi', '自': 'zi', '定': 'ding', '义': 'yi',
  '模': 'mo', '板': 'ban', '安': 'an', '装': 'zhuang', '下': 'xia', '载': 'zai'
};

function toPinyin(text) {
  let result = '';
  for (let ch of text) {
    result += PINYIN_MAP[ch] || ch.toLowerCase();
  }
  return result;
}

// 搜索函数
function searchArticles(articles, keyword) {
  if (!keyword || !keyword.trim()) return articles;
  const kw = keyword.trim().toLowerCase();
  const kwPinyin = toPinyin(kw);

  return articles.filter(a => {
    const title = (a.title || '').toLowerCase();
    const excerpt = (a.excerpt || '').toLowerCase();
    const content = stripHtml(a.content || '').toLowerCase();
    const titlePinyin = toPinyin(title);
    const excerptPinyin = toPinyin(excerpt);

    return title.includes(kw) ||
           excerpt.includes(kw) ||
           content.includes(kw) ||
           titlePinyin.includes(kwPinyin) ||
           excerptPinyin.includes(kwPinyin);
  });
}

module.exports = {
  parseXmlFeed,
  fetchArchivesDates,
  searchArticles,
  stripHtml,
  extractCover,
  extractExcerpt,
  formatDate,
  FALLBACK_COVERS
};
