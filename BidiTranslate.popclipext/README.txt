双向翻译 (Bidi Translate) — PopClip 扩展  v12.2
================================================

主栏按钮
--------
1. 翻译        由 PopClip 的 preview-result 处理：完整译文写入剪贴板，
               弹窗预览最多显示 160 字符，点预览即粘贴（不改原文）。
2. 翻译并替换  直接把译文替换掉选中原文（仅可输入处出现）。
3. 备选译法    给 2/3/4 个译法；复制到剪贴板 + 全屏大字显示。
4. 更多 ▸      子菜单：
   - 朗读原文 / 朗读译文（macOS 内置语音，用 $ shell 调 say，无需自动化授权）
   - 译成…（临时按指定语言翻译，不改设置）
   - 双语对照（译文 + 原文）
   - 语言学习卡（译文 + 生词/音标/例句 + 用法；源=目标时自动翻转方向）
   - 命名风格 ▸ camelCase / PascalCase / snake_case / kebab-case
   - 模型对比（同一预设的两个模型并排对照）
   - 自定义动作（用设置里的提示词做润色/解释/总结等）

多语言
------
源语言自动识别，目标语言在设置里选：
- 自动（默认）：中文 -> 英文；其它语言（日/韩/俄/法/德/西…）-> 中文。
- 也可固定：中文 / English / 日本語 / 한국어 / Русский / Français / Deutsch /
  Español / Português / Italiano / العربية / ไทย / Tiếng Việt。

关闭思考模式（默认开）
----------------------
仅当“模型名”明确支持时才注入参数，避免旧模型/别家报 400：
- deepseek-flash / deepseek-v4* / deepseek-v3.2*  -> thinking = {"type":"disabled"}
- glm-4.5 ~ glm-5*                               -> thinking = {"type":"disabled"}
- qwen3*                                          -> enable_thinking = false
- 其它：不注入
另外：填了与预设不同的“自定义 Base URL”时，按自定义处理，不注入该参数。

配置要点
--------
- 接口预设：默认 DeepSeek，模型 deepseek-flash（另有 deepseek-v4-pro）。
- API Key：对应平台密钥（存 macOS 钥匙串）。
- 朗读语音：留空按语言自动选；也可填系统语音名（Tingting / Samantha…）。
- 模型对比：填“对比：第二个模型”（如 deepseek-v4-pro）；跨厂商再填第二个预设与 Key。
- 自定义动作：填“自定义动作提示词”。

各平台 Base URL（OpenAI 兼容）
------------------------------
- DeepSeek:   https://api.deepseek.com
- 通义(中国):  https://dashscope.aliyuncs.com/compatible-mode/v1
- 智谱:       https://open.bigmodel.cn/api/paas/v4
- Kimi:       https://api.moonshot.cn/v1
- StepFun:    https://api.stepfun.com/step_plan/v1
- OpenAI:     https://api.openai.com/v1

按 App 禁用
-----------
编辑 Config.js 里的 const excludedApps = []; 填入 bundle id。
数组留空时不会传给 PopClip，因此不会报错。
