双向翻译 (Bidi Translate) — PopClip 扩展  v12.4
===============================================

主栏按钮
--------
1. 翻译        由 PopClip 的 preview-result 处理：完整译文写入剪贴板，
               弹窗预览最多显示 160 字符，点预览即粘贴（不改原文）。
2. 翻译并替换  直接把译文替换掉选中原文（仅可输入处出现）。
               替换后自动恢复你原来的剪贴板内容。
3. 备选译法    给 2/3/4 个译法；复制到剪贴板 + 全屏大字显示。
4. 更多 ▸      子菜单：
   - 朗读原文 / 朗读译文（macOS 内置 say；朗读时点击转圈可停止）
   - 译成…      一次性按指定目标语言翻译（不改设置里的“目标语言”）
   - 双语对照（译文 + 原文，大字完整显示）
   - 语言学习卡（译文 + 生词/音标/例句 + 用法）
   - 命名风格 ▸ camelCase / PascalCase / snake_case / kebab-case（直接替换选中文字）
   - 模型对比（两个模型并排对照；跨厂商必须单独填第二个 Key，不会复用第一个）
   - 自定义动作（用设置里的提示词做润色/解释/总结等）

多语言
------
源语言自动识别，目标语言在设置里选：
- 自动（默认）：中文 -> 英文；其它语言（日/韩/俄/法/德/西…）-> 中文。
- 也可固定：中文 / English / 日本語 / 한국어 / Русский / Français / Deutsch /
  Español / Português / Italiano / العربية / ไทย / Tiếng Việt。
- 目标语言支持“其它…”自由输入语言名（如 Traditional Chinese、Cantonese、Latin），
  会原样传给提示词。临时翻译也可以用“更多 ▸ 译成…”选一次目标语言。

关闭思考模式（默认开）
----------------------
仅当“模型名”明确支持时才注入参数，避免旧模型/别家报 400：
- deepseek-flash / deepseek-v4* / deepseek-v3.2*  -> thinking = {"type":"disabled"}
- glm-4.5 ~ glm-5*                               -> thinking = {"type":"disabled"}
- qwen3*                                          -> enable_thinking = false
- 其它：不注入
另外：填了与预设不同的“自定义 Base URL”时，按自定义处理，不注入该参数。

朗读
----
- 语音留空按语言自动选（中文 Tingting、英文 Samantha、日 Kyoko、韩 Yuna、俄 Milena、
  法 Thomas、德 Anna、西 Monica、葡 Luciana…）；拉丁字母语言按特征字母粗分，不准也无妨。
- 也可填系统里的其它语音名（如 Meijia、Daniel）。
- “朗读语速”可填每分钟字数（约 120 慢 ～ 220 快），留空用系统默认（约 175）。
- 朗读期间 PopClip 显示转圈，点击转圈即停止。

配置要点
--------
- 接口预设：默认 DeepSeek（模型 deepseek-flash，另有 deepseek-v4-pro）。
- 模型：下拉选常用模型；列表里没有的选“Other…”手填；选“None”用预设默认模型。
  若所选模型属于别的预设（例如预设选了通义却留着 deepseek-flash），会自动改用
  当前预设的默认模型；用了自定义 Base URL 或“自定义”预设时不做这个判断。
- API Key：对应平台密钥（存 macOS 钥匙串）。
- 模型对比：在“对比：第二个模型”里另选一个模型；跨厂商再填第二个预设与 Key。
  同厂商时沿用第一个的地址和密钥（包括自定义 Base URL），只换模型。
- 自定义动作：填“自定义动作提示词”。

各平台 Base URL（OpenAI 兼容）
------------------------------
- DeepSeek:   https://api.deepseek.com
- 通义(中国):  https://dashscope.aliyuncs.com/compatible-mode/v1
- 智谱:       https://open.bigmodel.cn/api/paas/v4
- Kimi:       https://api.moonshot.cn/v1
- StepFun:    https://api.stepfun.com/v1（Step Plan 订阅用 /step_plan/v1）
- OpenAI:     https://api.openai.com/v1

按 App 禁用
-----------
编辑 Config.js 里的 const excludedApps = []; 填入 bundle id。
数组留空时不会传给 PopClip，因此不会报错。

注意：需要 PopClip 2026.8.1 或更新版本（用到了子菜单与 $ 命令标签）；
含 network/script 权限，首次安装会出现“未签名扩展”提示，属正常。
