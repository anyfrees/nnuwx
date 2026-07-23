// 常用 Unsplash 随机优质封面图降级兜底池
const FALLBACK_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80'
];

// 解码常见 HTML 实体字符
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// 剥离 HTML 标签获取纯文本摘要
function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// 优化 HTML 内容中的图片，增加响应式样式以适配微信小程序 rich-text
function formatRichTextHtml(rawHtml) {
  if (!rawHtml) return '';
  let html = decodeHtmlEntities(rawHtml);
  // 注入 style 使得正文图片宽度 100%，居中并带有精致圆角
  html = html.replace(/<img\b([^>]*)>/gi, function(match, p1) {
    if (!p1.includes('style=')) {
      return '<img ' + p1 + ' style="max-width:100%!important;height:auto!important;display:block;margin:24rpx auto;border-radius:16rpx;box-shadow:0 8rpx 20rpx rgba(0,0,0,0.06);" />';
    } else {
      return match.replace(/style=["']([^"']*)["']/i, 'style="$1;max-width:100%!important;height:auto!important;display:block;margin:24rpx auto;border-radius:16rpx;"');
    }
  });
  return html;
}

// 通用全能 XML / RSS / Atom 动态解析器
function parseXmlFeed(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') {
    return { articles: [], categories: [], tags: [] };
  }

  // 1. 预先剥离 CDATA 嵌套包裹，确保正则能匹配到正文
  let cleanXml = xmlText.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, function(match, p1) {
    return p1;
  });

  const articles = [];
  const categoriesSet = new Set();
  const tagsSet = new Set();

  // 2. 查找 <entry> 或 <item> 节点
  const itemMatches = cleanXml.match(/<(entry|item)[\s\S]*?<\/\1>/gi) || [];

  itemMatches.forEach((itemXml, index) => {
    // 标题
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let rawTitle = titleMatch ? titleMatch[1].trim() : '无标题文章';
    let title = decodeHtmlEntities(stripHtmlTags(rawTitle));

    // 链接
    let url = '#';
    const linkHrefMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (linkHrefMatch) {
      url = linkHrefMatch[1];
    } else {
      const linkTagMatch = itemXml.match(/<(?:link|url)[^>]*>([\s\S]*?)<\/(?:link|url)>/i);
      if (linkTagMatch) {
        url = decodeHtmlEntities(linkTagMatch[1].trim());
      }
    }

    // 正文内容与摘要
    const contentMatch = itemXml.match(/<(?:content|description|summary|encoded)[^>]*>([\s\S]*?)<\/(?:content|description|summary|encoded)>/i);
    let rawContent = contentMatch ? contentMatch[1].trim() : '';
    let formattedContent = formatRichTextHtml(rawContent);
    let plainContent = stripHtmlTags(rawContent);
    let excerpt = plainContent.slice(0, 110) + (plainContent.length > 110 ? '...' : '');

    // 提取封面图 (提取正文中的第一张图片，或媒体节点)
    let coverImage = '';
    const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i) || itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      coverImage = imgMatch[1];
    } else {
      coverImage = FALLBACK_COVER_IMAGES[index % FALLBACK_COVER_IMAGES.length];
    }

    // 发布日期
    const dateMatch = itemXml.match(/<(?:pubDate|published|updated|date|created)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|date|created)>/i);
    let rawDate = dateMatch ? dateMatch[1].trim() : '';
    let date = new Date().toISOString().split('T')[0];
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          date = d.toISOString().split('T')[0];
        } else {
          date = rawDate.slice(0, 10);
        }
      } catch (e) {
        date = rawDate.slice(0, 10);
      }
    }

    // 作者
    const authorMatch = itemXml.match(/<(?:author|dc:creator|creator)[^>]*>([\s\S]*?)<\/(?:author|dc:creator|creator)>/i);
    let author = authorMatch ? stripHtmlTags(decodeHtmlEntities(authorMatch[1])) : '博主';

    // 提取分类与标签
    const itemCategories = [];
    const itemTags = [];

    const catMatches = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    catMatches.forEach(catStr => {
      const termMatch = catStr.match(/term=["']([^"']+)["']/i);
      let catName = termMatch ? termMatch[1] : catStr.replace(/<[^>]+>/g, '').trim();
      catName = decodeHtmlEntities(catName);
      if (catName) {
        if (catStr.includes('scheme="tag"') || catStr.includes('type="tag"')) {
          itemTags.push(catName);
          tagsSet.add(catName);
        } else {
          itemCategories.push(catName);
          categoriesSet.add(catName);
        }
      }
    });

    const tagMatches = itemXml.match(/<tag[^>]*>([\s\S]*?)<\/tag>/gi) || [];
    tagMatches.forEach(tagStr => {
      let tagName = decodeHtmlEntities(tagStr.replace(/<[^>]+>/g, '').trim());
      if (tagName) {
        itemTags.push(tagName);
        tagsSet.add(tagName);
      }
    });

    articles.push({
      id: 'art_' + (index + 1) + '_' + Date.now().toString().slice(-4),
      title: title || '无标题文章',
      url: url,
      excerpt: excerpt || '暂无内容摘要',
      content: formattedContent || ('<p>' + excerpt + '</p>'),
      categories: itemCategories.length ? itemCategories : ['默认分类'],
      tags: itemTags.length ? itemTags : ['随笔'],
      date: date,
      author: author,
      coverImage: coverImage,
      views: Math.floor(Math.random() * 800) + 120,
      likes: Math.floor(Math.random() * 90) + 10,
      readTime: Math.max(1, Math.ceil(plainContent.length / 400))
    });
  });

  return {
    articles: articles,
    categories: Array.from(categoriesSet),
    tags: Array.from(tagsSet)
  };
}

module.exports = {
  parseXmlFeed: parseXmlFeed
};