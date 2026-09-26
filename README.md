# 双向翻译 · Bidi Translate

一个 macOS [PopClip](https://pilotmoon.com/popclip/) 扩展：选中文字即可翻译。默认使用 DeepSeek 官方 `deepseek-flash`，当前对应 DeepSeek V4.1 Flash；也支持多家 OpenAI 兼容接口和实验性的 OpenCode Go 多协议模型。

> 当前版本：**v15.0**。需要 PopClip 2026.8.1（build 6221）或更高版本。

## 功能

### 主栏

| 按钮 | 行为 |
| --- | --- |
| **翻译** | 自动判断方向，结果流式预览；完整译文进入剪贴板，点击预览可粘贴 |
| **翻译并替换** | 在支持 Paste 的输入框中直接替换选中文字，并恢复原剪贴板 |
| **备选译法** | 生成 2 / 3 / 4 个不同表达，复制并用全屏大字显示 |

### 更多

- 朗读原文 / 朗读译文
- 译成…：临时指定目标语言
- 双语对照
- 语言学习卡：翻译、生词、音标、例句和用法
- 命名风格：`camelCase` / `PascalCase` / `snake_case` / `kebab-case`
- 模型对比：两个模型并行翻译并显示耗时、token
- Go 模型目录：读取 OpenCode Go 的实时模型 ID
- 自定义动作：润色、解释、总结、邮件改写等

### 稳定性与体验

- SSE 流式显示；不支持流式的接口自动回退为完整响应
- 主接口失败时可选自动使用第二接口
- 408、429、5xx 和网络超时自动重试一次
- 长文本按段落、换行和句末自动分段翻译
- 术语表、目标语言、语气 / 领域设置
- API Key 使用 macOS 钥匙串保存

## 安装

1. 下载 `BidiTranslate.popclipextz`。
2. 双击安装并按 PopClip 提示确认。
3. 选中文字，打开扩展设置并填写 API Key。

## 默认配置

- 接口预设：**DeepSeek API**
- 模型：**`deepseek-flash`**（DeepSeek V4.1 Flash）
- 目标语言：自动
- 关闭思考：开启
- 流式显示：开启
- 长文本自动分段：开启
- 自动备用接口：关闭，避免用户不知情地产生额外用量

## 接口与模型

| 预设 | Base URL | 默认模型 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-flash` |
| 通义 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.5-flash` |
| Kimi | `https://api.moonshot.cn/v1` | `kimi-k2.6` |
| StepFun | `https://api.stepfun.com/v1` | `step-3.7-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4.1-mini` |
| OpenCode Go（实验） | `https://opencode.ai/zen/go/v1` | `deepseek-v4.1-flash` |

### OpenCode Go

在“接口预设”选择 **OpenCode Go（实验）**，填写 OpenCode Console 创建的 Go API Key。当前支持：

- Chat Completions：DeepSeek、GLM、Kimi、MiMo、LongCat、Hy3 等
- Responses：GPT、Grok、Muse Spark
- Anthropic Messages：Qwen、MiniMax

协议默认自动识别；填写 Other… 的新模型时，可以在“OpenCode Go 协议”中手动指定协议。Go 模型目录会变化，可使用“更多 → Go 模型目录”查看实时列表。

OpenCode Go 官方主要面向编程代理流量，翻译场景属于实验性使用；请注意套餐额度、服务端策略和各模型的数据保留政策。

## 重要设置

### 主接口失败时使用备用接口

打开后，翻译、学习卡、命名风格和自定义动作遇到限流、超时或 5xx 时，会使用“第二个预设 / 模型”重试。需要配置第二个 API Key；与主接口完全相同的模型不会作为备用。

### 流式显示

默认开启。PopClip 会在生成过程中更新预览，但复制和粘贴仍会等待完整结果。模型对比固定使用普通响应，避免两个模型同时刷新同一预览。

### 长文本

默认每次请求最多 24,000 个 Unicode 字符。打开长文本分段后，超出部分会顺序分段翻译并合并，可能产生多次请求。

填 `0` 表示取消插件字符上限，同时也不会自动分段；这不代表厂商 API 没有上下文限制。

## 思考模式

扩展只在已知支持时注入参数：

- DeepSeek：`thinking: {type: "disabled"}`
- GLM-5.3 / GLM-5.3 Flash：不能关闭思考，自动使用 `reasoning_effort: "low"`
- 其它支持关闭的 GLM：`thinking: {type: "disabled"}`
- Qwen3：`enable_thinking: false`

使用自定义 Base URL / 代理时，扩展不会主动注入思考参数。

## 按 App 禁用

编辑 `BidiTranslate.popclipext/Config.js` 中的静态数组：

```js
const excludedApps = ["com.apple.Terminal", "com.microsoft.VSCode"];
```

数组留空时不限制 App。由于 PopClip 的 network 扩展不能同时使用动态 population，不能把这个功能做成普通设置项。

## 常见问题

- **401 / 无权限**：检查对应接口的 API Key；跨厂商备用或对比时需要单独填写第二个 Key。
- **HTTP 400**：检查模型 ID、OpenCode Go 协议选择和额外请求参数；GLM-5.3 不要手动发送 `thinking: {type:"disabled"}`。
- **仍然很慢**：确认“关闭思考模式”已开启；GLM-5.3 只能使用 low effort。网络、服务端排队和文本长度也会影响速度。
- **流式没有逐字显示**：部分代理不会转发 SSE，扩展会自动改用完整响应，但最终翻译仍可正常完成。
- **想使用新 Go 模型**：先用“更多 → Go 模型目录”查看 ID，再在模型中选择 Other…，并按模型接口选择 Go 协议。

## 从源码构建

```bash
npm test
npm run load
npm run build
```

`npm run load` 使用 PopClip 自带 JavaScript 测试环境检查模块加载；`npm run build` 会生成 `BidiTranslate.popclipextz` 并排除 `.DS_Store`。

## 更新日志

- **v15.0**：新增 SSE 流式预览；支持 OpenCode Go 的 Chat Completions、Responses 和 Anthropic Messages；新增协议自动识别与手动选择；完善备用接口、长文本分段、自动重试和实时 Go 模型目录。
- **v14.0**：新增备用接口、长文本分段、429/5xx 重试和 Go 实时模型目录。
- **v13.3**：修复 GLM-5.3 / GLM-5.3 Flash 不能关闭思考模式的问题。
- **v13.1–v13.2**：合并重复中英入口，默认 DeepSeek V4.1 Flash，加入 OpenCode Go 实验预设并修复 `0` 不限字符数。

## 文件结构

```text
BidiTranslate/
├── README.md
├── LICENSE
├── package.json
├── BidiTranslate.popclipextz
├── test/
│   ├── lib.test.js
│   └── load.js
└── BidiTranslate.popclipext/
    ├── Config.js
    ├── lib.js
    └── README.txt
```

## 官方参考

- [PopClip Actions](https://www.popclip.app/dev/actions)
- [PopClip JavaScript environment](https://www.popclip.app/dev/js-environment)
- [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)
- [OpenCode Go](https://opencode.ai/v2/docs/console/go)
- [GLM Thinking](https://docs.z.ai/guides/capabilities/thinking)

## License

MIT
