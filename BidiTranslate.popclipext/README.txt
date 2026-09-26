双向翻译 (Bidi Translate) — PopClip 扩展 v15.0
===============================================

这一版在 v14.0 基础上增加：SSE 流式显示、OpenCode Go 的 Responses / Anthropic Messages 协议支持，以及协议自动识别和手动覆盖。
保留原有设置；模型选项通过 PopClip 的 migrateFrom 迁移已有非空选择。旧版空模型选项升级后显示 DeepSeek V4.1 Flash。

主栏按钮
--------
1. 翻译
   主栏唯一的翻译入口，按设置里的“目标语言”翻译。自动模式：中文 -> English，其它语言 -> 简体中文。
   结果进入剪贴板并预览；点预览可粘贴。

2. 翻译并替换
   仅在支持 Paste 的输入处显示；直接把译文替换选中文字，并恢复原剪贴板。

3. 备选译法
   按设置生成 2/3/4 个不同表达，复制到剪贴板并大字显示。

4. 更多 ▸
   - 朗读原文 / 朗读译文：macOS say，点击 PopClip 转圈可停止。
   - 译成…：一次性指定目标语言，不改变设置。
   - 双语对照：译文 + 原文，大字显示。
   - 语言学习卡：中英翻译 + 生词/音标/例句/用法。
   - 命名风格：camelCase / PascalCase / snake_case / kebab-case，仅在支持 Paste 时显示。
    - 模型对比：两个模型并行翻译，并显示耗时；接口返回 usage 时同时显示 token 数。
    - Go 模型目录：读取 OpenCode Go 的实时模型 ID，方便手动填写新模型。
    - 自定义动作：使用设置里的提示词完成润色、解释、总结等。

模型与思考模式
--------------
模型列表采用“已知模型表 + Other…”设计。未知模型仍可手填，不会因为模型名不在列表里被拦截。升级兼容：旧版保存的 deepseek-chat、deepseek-reasoner、deepseek-v4-flash 等会自动迁移到 deepseek-flash。

DeepSeek 当前默认明确选中 V4.1 Flash，API 模型名为 deepseek-flash。DeepSeek 官方在 2026-09-10 发布 V4.1-Flash；旧 deepseek-chat / deepseek-reasoner 已不再作为推荐模型名。
截至本版，deepseek-v4-pro 仍保留为兼容入口，但不要把它理解为独立于 Flash 的第二个“质量优先”选项；官方近期说明该入口存在路由调整。

思考模式现在由 lib.js 的模型能力规则集中处理：
- DeepSeek：thinking = {type:"disabled"}
- GLM-5.3 / GLM-5.3 Flash：thinking = {type:"enabled"}, reasoning_effort = "low"（官方不允许关闭）
- 其它支持关闭的 GLM：thinking = {type:"disabled"}
- Qwen3：enable_thinking = false
- 未知模型：不主动注入思考参数，减少 400 风险

注意：如果填写了不同于预设的自定义 Base URL / 代理，本扩展视为自定义接口，不主动注入关闭思考参数。

备用接口与重试
--------------
在设置中打开“主接口失败时使用备用接口”后，翻译、学习卡、命名风格和自定义动作遇到限流、超时或 5xx 时，会使用“第二个预设 / 模型”重试。
第二个接口必须有有效 API Key，且不能与主接口使用完全相同的地址和模型；该功能默认关闭，避免用户不知情地产生第二次用量。
每次请求遇到 408、429、5xx 或网络超时会自动重试一次；401/403、400 等配置或参数错误不会重试。

流式显示
--------
默认打开“流式显示结果”。Chat Completions、Responses 和 Anthropic Messages 的 SSE 内容会逐步更新 PopClip 预览；完整结果返回后才执行复制或粘贴。
如果代理不支持 `stream=true`，扩展会自动改用普通完整响应。模型对比固定使用普通响应，避免两个模型同时刷新同一个预览。

OpenCode Go（实验性）
---------------------
在“接口预设”选择 OpenCode Go，并在 API Key 中填写 OpenCode Console 创建的 Go Key。默认地址为 https://opencode.ai/zen/go/v1。
此适配会发送 Bearer Key、User-Agent `BidiTranslate-PopClip/15.0` 和每次翻译独立的 `x-opencode-session`。

下拉列表基于 2026-09-25 官方目录，现已支持三类协议：DeepSeek / GLM / Kimi / MiMo 等 `/chat/completions`；GPT、Grok、Muse Spark 的 `/responses`；Qwen、MiniMax 的 Anthropic `/messages`。
“OpenCode Go 协议”默认自动识别；使用 Other…填写新模型时，可手动选择 Chat Completions、Responses 或 Anthropic Messages。PopClip 设置列表仍是静态目录，可用“Go 模型目录”查看实时 ID。

注意：OpenCode Go 官方主要面向编程代理流量，翻译使用属于实验场景，不保证可用；请求可能受套餐额度、服务端策略及模型目录变化影响。选中的文本会发送给 OpenCode Go，模型的数据保留政策因模型而异，详见官方文档。

响应延迟
--------
DeepSeek 官方 API 默认开启思考模式；本扩展默认勾选“关闭思考模式”，使用默认 DeepSeek 地址和模型时会发送 thinking={type:"disabled"}。GLM-5.3 / Flash 是例外：官方不支持关闭思考，扩展会自动改用 low effort。
如果取消勾选，或填写自定义 Base URL / 代理，服务端可能仍开启思考。
流式开启时会先显示逐步生成的预览，复制或粘贴仍要等完整译文返回；关闭流式或服务端不支持时，PopClip 会等完整译文后显示。网络、服务端排队、文本长度和译文长度也会影响等待时间，因此延迟不一定是思考造成的。

语言检测 / 朗读
----------------
自动翻译由模型判断原文语言；朗读语音仍使用“文字系统 + 常见词/特征字符”的轻量启发式。
检测之前会忽略 URL、邮箱和代码片段，减少混合文本误判。纯汉字可能同时是中文或日文，学习卡在这种情况下会交给模型判断。

超长文本保护
------------
默认每次 API 请求最多 24000 个 Unicode 字符，打开“长文本自动分段翻译”后，超出部分会按段顺序翻译并合并，可能产生多次请求。
备选译法、模型对比、学习卡和命名风格不自动分段；填写 0 表示不限制且不触发分段。这个值不是任何厂商的 API 上限，只是本扩展的 UX 安全阈值。

额外请求参数
------------
“额外请求参数 (JSON)”可以加入 top_p、max_tokens、max_output_tokens、reasoning_effort 等高级参数。
为避免把基础请求结构破坏掉，不能覆盖：model、messages、stream、input、instructions、system。

模型对比
--------
- 第二个预设为“与当前相同”时，沿用当前地址和 Key，只换第二模型。
- 跨厂商时必须提供第二个 API Key；不会复用第一厂商的 Key。
- 结果示例：
  ① deepseek-flash · 1.24s · 83 tok
  ……

  ② qwen-plus · 1.51s · 91 tok
  ……

各平台 Base URL（OpenAI 兼容）
------------------------------
- DeepSeek:   https://api.deepseek.com
- 通义(中国):  https://dashscope.aliyuncs.com/compatible-mode/v1
- 智谱:       https://open.bigmodel.cn/api/paas/v4
- Kimi:       https://api.moonshot.cn/v1
- StepFun:    https://api.stepfun.com/v1
- OpenAI:     https://api.openai.com/v1
- OpenCode Go: https://opencode.ai/zen/go/v1

按 App 禁用
-----------
编辑 Config.js 里的 const excludedApps = []; 填入 bundle id。
数组留空时不会传给 PopClip。

兼容性
------
需要 PopClip 2026.8.1 或更新版本（使用子菜单、JavaScript $ 命令与当前 option/action API）。
含 network/script 权限。

官方参考
--------
PopClip Actions: https://www.popclip.app/dev/actions
PopClip Options: https://www.popclip.app/dev/options
DeepSeek API 更新日志: https://api-docs.deepseek.com/zh-cn/updates/
DeepSeek 模型与价格: https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
DeepSeek 思考模式: https://api-docs.deepseek.com/guides/thinking_mode
OpenCode Go: https://opencode.ai/v2/docs/console/go
GLM 思考模式: https://docs.z.ai/guides/capabilities/thinking
