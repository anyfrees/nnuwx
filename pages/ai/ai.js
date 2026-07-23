Page({
  data: {
    messages: [
      { role: 'assistant', content: '您好！我是 NNU 博客 AI 智能助手，请问有什么可以帮您？' }
    ],
    inputText: ''
  },
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },
  sendMessage() {
    if (!this.data.inputText.trim()) return;
    const userMsg = { role: 'user', content: this.data.inputText };
    const newMsgs = [...this.data.messages, userMsg];
    this.setData({ messages: newMsgs, inputText: '' });

    setTimeout(() => {
      const reply = { role: 'assistant', content: '感谢提问！这是针对包含文章库的 AI 总结与推荐回复。' };
      this.setData({ messages: [...newMsgs, reply] });
    }, 600);
  }
});