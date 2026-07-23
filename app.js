App({
  globalData: {
    blogUrl: 'https://www.nnu.cn/search.xml',
    articles: [
      {
        id: 'art_1',
        title: '基于深度学习的全栈现代化架构实战',
        excerpt: '探讨当前深度学习框架与前后端分离架构的无缝集成方案，包含系统性能优化与工程落地经验...',
        content: '这是《基于深度学习的全栈现代化架构实战》的详细内容。本文深入讲解了全栈技术架构在现代化项目中的设计思路...',
        categories: ['深度学习'],
        tags: ['React', 'TypeScript', 'AI Framework'],
        date: '2026-07-20',
        views: 650,
        readTime: 5
      },
      {
        id: 'art_2',
        title: 'NNU 校园 AI 数字人协同助手构建',
        excerpt: '介绍了在校园应用场景下，结合大语言模型构建多功能交互数字人客服的完整实践路径...',
        content: '这是《NNU 校园 AI 数字人协同助手构建》的详细内容。介绍基于 LLM 与 Agent 的数字人协同助手开发...',
        categories: ['AI应用'],
        tags: ['NNU', 'Agent', 'AI助手'],
        date: '2026-07-18',
        views: 890,
        readTime: 4
      },
      {
        id: 'art_3',
        title: '微信小程序原生开发的最佳实践范例',
        excerpt: '梳理微信小程序原生框架的核心组件使用技巧、动态数据绑定与 RSS / XML 解析方案...',
        content: '这是《微信小程序原生开发的最佳实践范例》的详细内容。涵盖全自动 RSS 节点抓取、模块化解耦与响应式布局...',
        categories: ['前端开发'],
        tags: ['小程序', 'WXML', '前端架构'],
        date: '2026-07-15',
        views: 1200,
        readTime: 6
      }
    ],
    categories: ['深度学习', 'AI应用', '前端开发', '学术前沿'],
    tags: ['React', 'TypeScript', '小程序', 'NNU', 'Agent', 'AI Framework']
  },
  onLaunch() {
    console.log('NNU 博客小程序启动成功');
  }
});