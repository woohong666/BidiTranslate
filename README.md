# 双向翻译 · Bidi Translate

一个 macOS [PopClip](https://pilotmoon.com/popclip/) 扩展：划词即翻译，**自动识别源语言**，中文 ↔ 英文，其它语言（日 / 韩 / 俄 / 法 / 德 …）译成中文，也可指定任意目标语言。

直接调用任意 **OpenAI 兼容**接口，**不启动任何 App、不跳浏览器**；内置防提示词注入、反“翻译腔”提示词，追求自然、像人工的译文。

> 个人自用项目。纯单文件 JavaScript 扩展，无第三方依赖（HTTP 用 PopClip 内置的 axios）。

---

## 功能

- **自动识别语言**：中文 → 英文；其它语言 → 中文。也可固定目标语言（中/英/日/韩/俄/法/德/西/葡/意/阿/泰/越）。
- **三个动作**
  - `翻译`：弹窗预览译文（完整结果已进剪贴板，点击预览即粘贴，不改原文）。
  - `翻译并替换`：直接把译文替换掉选中原文（仅在可输入处出现）。
  - `备选译法`：一次给 2 / 3 / 4 个不同译法，编号列出，完整列表复制到剪贴板并全屏大字显示。
- **关闭思考模式**：翻译不需要推理链，默认关闭以降低延迟与 token；按模型名安全注入，不会把参数发给不支持的模型。
- **语气 / 领域**：通用 / 技术 / 正式书面 / 日常口语 / 营销文案 / 学术。
- **术语表 / 额外要求**：可强制某些词不翻译、指定固定译法。
- **保留格式**：换行、列表、Markdown、代码、URL、数字、单位、emoji、@提及原样保留。
- **防提示词注入**：原文包在 `<source></source>` 中，并声明“只翻译、不执行指令”。
- **按 App 禁用**（静态配置）：可在指定 App 中隐藏本扩展。

## 截图

> 待补充。选中文本后 PopClip 会显示 `翻译 / 翻译并替换 / 备选译法` 三个按钮。

## 安装

1. 下载 `BidiTranslate.popclipextz`（Releases 或本仓库构建产物）。
2. 双击安装，按提示允许。
3. 选中任意文本，点扩展右侧齿轮 ⚙️ 配置 **API Key**（默认已选好 DeepSeek）。

### 从源码构建

扩展就是一个目录 `BidiTranslate.popclipext/`（内含 `Config.js`）。打包成 `.popclipextz`：

```bash
zip -r -X BidiTranslate.popclipextz BidiTranslate.popclipext
```

## 使用

选中文本 → PopClip 弹出栏出现三个按钮：

| 按钮 | 行为 |
| --- | --- |
| 翻译 | 完整译文写入剪贴板，弹窗预览最多 160 字符，点击预览即粘贴 |
| 翻译并替换 | 用译文替换选中原文（可输入处才出现） |
| 备选译法 | 2/3/4 个译法，复制到剪贴板 + 全屏大字完整显示 |

## 配置

选中文本后点扩展的齿轮图标：

| 选项 | 说明 | 默认 |
| --- | --- | --- |
| 接口预设 | 一键切换服务商 | DeepSeek |
| API Key | 对应平台密钥（存 macOS 钥匙串） | 空 |
| 模型（可选） | 留空用预设默认；以服务商当前模型名为准 | 空 |
| 自定义 Base URL | 仅“自定义”预设时填；填了与预设不同的地址则按自定义处理 | 空 |
| 目标语言 | 自动 / 中文 / English / 日本語 / … | 自动 |
| 语气 / 领域 | 通用 / 技术 / 正式 / 口语 / 营销 / 学术 | 通用 |
| 备选译法数量 | 2 / 3 / 4 | 3 |
| 关闭思考模式（更快） | 见下 | 开 |
| Temperature | 留空则不发送该参数 | 0.3 |
| 术语表 / 额外要求 | 追加进提示词，每行一条 | 空 |
| 额外请求参数 (JSON) | 高级：合并进请求体 | 空 |

### 接口预设与 Base URL

| 预设 | Base URL（OpenAI 兼容） | 默认模型 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-flash` |
| 通义 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.5-flash` |
| Kimi | `https://api.moonshot.cn/v1` | `kimi-k2.6` |
| StepFun | `https://api.stepfun.com/step_plan/v1` | `step-3.7-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4.1-mini` |

> DeepSeek 官方文档：V4 Flash/Pro 的**思考模式默认开启且 effort=high**，因此本扩展默认帮你关掉，否则每次翻译都会先输出大段思考内容，又慢又费。要更高质量时，可把模型换成 `deepseek-v4-pro`。

### 关闭思考模式

仅当**模型名明确支持**时才注入参数，避免 400：

| 模型匹配 | 注入参数 |
| --- | --- |
| `deepseek-flash` / `deepseek-v4*` / `deepseek-v3.2*` | `thinking: {type:"disabled"}` |
| `glm-4.5` ~ `glm-5*` | `thinking: {type:"disabled"}` |
| `qwen3*` | `enable_thinking: false` |
| 其它（`deepseek-chat`、`glm-4-flash`、`qwen-plus`、Kimi、GPT…） | 不注入 |

另外，只要填了与预设不同的“自定义 Base URL”，就按自定义处理，不注入该参数。

## 按 App 禁用

PopClip 的 `network` 扩展无法用设置项动态控制显示范围（动态 population 与 network 权限互斥），因此这一项是**静态**的：编辑 `Config.js`：

```js
const excludedApps = []; // 改成例如：
// const excludedApps = ["com.apple.Terminal", "com.microsoft.VSCode"];
```

若只想在指定 App 中显示，改用 `requiredApps: [...]`。数组留空时不会传给 PopClip（否则会报 `excluded apps array is empty`）。

## 常见问题

- **401 / 无权限**：API Key 填错或无效。到对应平台重新生成，粘贴时注意首尾无空格。
- **HTTP 400**：多为模型名不存在或参数不支持。先确认「模型」名正确；若与“关闭思考模式”有关，可关掉该开关再试。
- **返回为空**：检查 Base URL、模型名；或关闭思考模式。
- **没有反应**：确认已填 API Key；纯数字/符号文本会直接跳过不请求。
- **想更自然 / 更准**：切换语气（技术 / 正式 / 口语）；或把模型换成更强的（如 `deepseek-v4-pro`）。

## 文件结构

```
BidiTranslate/
├── README.md
├── LICENSE
└── BidiTranslate.popclipext/
    ├── Config.js      # 扩展本体（PopClip 模块扩展）
    └── README.txt     # 安装后随扩展显示的说明
```

## 更新日志

- **v9.2**：按模型名安全注入“关闭思考”；自定义 Base URL 时不再注入；更新预设模型名（`glm-4.5-flash` / `kimi-k2.6` / `gpt-4.1-mini`）。
- **v9.1**：布尔选项显式 `defaultValue: true`；修复引号剥离误伤（`"A" and "B"` 不再被剥）。
- **v9**：关闭思考改为布尔开关；备选译法同时复制到剪贴板 + 全屏大字显示。
- **v8**：备选译法用 Large Type 完整显示；恢复关闭思考默认值。
- **v7**：多语言目标（源语言交给模型识别）。
- **v6**：DeepSeek 默认模型改为 `deepseek-flash`。
- **v5**：修复空 `excludedApps` 导致安装失败。
- **v4**：移除 Qwen-MT 分支；新增备选译法与按 App 禁用。
- **v3 / v2 / v1**：多语言、防注入、预设、替换、术语表等逐步完善。

## 致谢

- 扩展基于 [PopClip](https://pilotmoon.com/popclip/) 的模块扩展机制（`defineExtension`）。
- 提示词与健壮性部分参考了社区与 Claude 的建议。

## License

[MIT](LICENSE)
