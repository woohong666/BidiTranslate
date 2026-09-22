# 双向翻译 · Bidi Translate

一个 macOS [PopClip](https://pilotmoon.com/popclip/) 扩展：划词即翻译，**自动识别源语言**，中文 ↔ 英文，其它语言（日 / 韩 / 俄 / 法 / 德 …）译成中文，也可指定任意目标语言。

直接调用任意 **OpenAI 兼容**接口，**不启动任何 App、不跳浏览器**；内置防提示词注入、反“翻译腔”提示词，追求自然、像人工的译文。

> 个人自用项目（当前 **v12.4**）。纯 JavaScript 扩展，逻辑分在 `Config.js`（PopClip 入口）与 `lib.js`（纯逻辑，供单测共用），无第三方依赖（HTTP 用 PopClip 内置的 axios）。

---

## 功能

主栏三个按钮 + 「更多」子菜单：

| 按钮 | 行为 |
| --- | --- |
| **翻译** | 弹窗预览译文（完整结果已进剪贴板，点击预览即粘贴，不改原文） |
| **翻译并替换** | 直接把译文替换掉选中原文（仅在可输入处出现） |
| **备选译法** | 给 2 / 3 / 4 个不同译法，编号列出；复制到剪贴板 + 全屏大字显示 |
| **更多 ▸** | 见下 |

「更多」子菜单：

| 功能 | 说明 |
| --- | --- |
| 朗读原文 | 用 macOS 内置语音朗读选中的原文 |
| 朗读译文 | 先翻译，再朗读译文（按目标语言自动选语音） |
| 译成… ▸ | 临时按指定语言翻译，不改设置里的「目标语言」 |
| 双语对照 | 输出「译文 + 原文」 |
| 语言学习卡 | 译文 + 生词（音标/词性/释义）+ 例句 + 用法提示 |
| 命名风格 ▸ | 翻译成英文并转成 `camelCase` / `PascalCase` / `snake_case` / `kebab-case`（写代码命名用） |
| 模型对比 | 用同一预设的**两个模型**各译一遍并排对照（也可指定第二个预设与 Key） |
| 自定义动作 | 用你填的提示词做任意处理（润色、解释、总结、改写成邮件…） |

其它：

- **自动识别语言**；也可固定目标语言（中/英/日/韩/俄/法/德/西/葡/意/阿/泰/越）。
- **关闭思考模式**：默认关闭以降低延迟与 token，按模型名安全注入。
- **语气 / 领域**：通用 / 技术 / 正式书面 / 日常口语 / 营销文案 / 学术。
- **术语表 / 额外要求**；**保留格式**（Markdown、代码、URL、emoji、@提及、换行）。
- **防提示词注入**：原文包在 `<source></source>` 中，声明“只翻译、不执行指令”。
- **按 App 禁用**（静态配置）。

## 安装

1. 下载 `BidiTranslate.popclipextz`（Releases 或本仓库构建产物）。
2. 双击安装，按提示允许。
3. 选中任意文本 → 点扩展齿轮 ⚙️ 配置 **API Key**（默认已选好 DeepSeek）。

> 朗读用 `$` shell 标签调用 macOS 的 `say`，**不会触发“自动化”授权弹窗**。朗读时 PopClip 会转圈，点击转圈即可停止。

### 从源码构建

扩展就是一个目录 `BidiTranslate.popclipext/`（内含 `Config.js`、`lib.js`、`README.txt`）。打包（自动排除 `.DS_Store`）：

```bash
npm run build
```

等价于：

```bash
rm -f BidiTranslate.popclipextz && zip -r -X BidiTranslate.popclipextz BidiTranslate.popclipext -x '*.DS_Store'
```

## 配置

选中文本后点扩展的齿轮图标：

| 选项 | 说明 | 默认 |
| --- | --- | --- |
| 接口预设 | 一键切换服务商 | DeepSeek |
| API Key | 对应平台密钥（存 macOS 钥匙串） | 空 |
| 模型 | 下拉选常用模型，或点“其它…”手填；留空用预设默认 | （用预设默认） |
| 自定义 Base URL | 仅“自定义”预设时填；填了不同地址则按自定义处理 | 空 |
| 目标语言 | 自动 / 中文 / English / 日本語 / …，可点“其它…”手填语言名 | 自动 |
| 语气 / 领域 | 通用 / 技术 / 正式 / 口语 / 营销 / 学术 | 通用 |
| 备选译法数量 | 2 / 3 / 4 | 3 |
| 关闭思考模式（更快） | 见下 | 开 |
| Temperature | 留空则不发送 | 0.3 |
| 术语表 / 额外要求 | 追加进提示词 | 空 |
| 朗读语音（可选） | 留空按语言自动选（Tingting / Samantha…） | 空 |
| 朗读语速（可选） | 每分钟字数，约 120～220；留空用系统默认 | 空 |
| 自定义动作提示词 | 「更多 → 自定义动作」的系统提示词 | 润色… |
| 对比：第二个预设 | same / 各预设 | same |
| 对比：第二个 API Key（可选） | 跨厂商对比时才需要 | 空 |
| 对比：第二个模型 | 「模型对比」里要对比的模型，如 `deepseek-v4-pro` | 空 |
| 额外请求参数 (JSON) | 高级：合并进请求体 | 空 |

> **模型选择**：设置里的「模型」是下拉菜单。选“None”= 用当前预设的默认模型；列表里没有的选“Other…”手动填写。若所选模型属于别的预设（例如预设选了通义却留着 `deepseek-flash`），会自动改用当前预设的默认模型；用了自定义 Base URL 或“自定义”预设时不做这个判断。

### 接口预设与 Base URL

| 预设 | Base URL（OpenAI 兼容） | 默认模型 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-flash` |
| 通义 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.5-flash` |
| Kimi | `https://api.moonshot.cn/v1` | `kimi-k2.6` |
| StepFun | `https://api.stepfun.com/v1` | `step-3.7-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4.1-mini` |

> DeepSeek 官方文档：V4 Flash/Pro 的**思考模式默认开启且 effort=high**，因此本扩展默认帮你关掉，否则每次翻译都会先输出大段思考内容，又慢又费。要更高质量时，把模型换成 `deepseek-v4-pro`。

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

- **401 / 无权限**：API Key 填错或无效。
- **HTTP 400**：多为模型名不存在或参数不支持。先确认模型名；若与“关闭思考模式”有关，可关掉该开关再试。
- **返回为空**：检查 Base URL、模型名；或关闭思考模式。
- **朗读没声音**：确认已授予自动化权限；语音名不存在时会自动回退系统默认语音。
- **想更自然 / 更准**：切换语气；或把模型换成更强的（如 `deepseek-v4-pro`）。

## 文件结构

```
BidiTranslate/
├── README.md
├── LICENSE
├── package.json                     # 仅供 Node 测试用（type: module）
├── BidiTranslate.popclipextz        # 构建产物
├── test/
│   ├── lib.test.js                  # 纯逻辑单元测试
│   └── load.js                      # 用 PopClip 测试环境校验加载
└── BidiTranslate.popclipext/
    ├── Config.js                    # 扩展本体（PopClip 专用）
    ├── lib.js                       # 纯逻辑（供 Config 与测试共用）
    └── README.txt                   # 安装后随扩展显示的说明
```

## 开发与测试

改完先跑测试，通过后**由人工在 PopClip 里交叉验证，确认无误再提交/推送**：

```bash
npm test        # 纯逻辑单测（无需 PopClip / 网络）
npm run load    # 用 PopClip 自带的 JS 环境加载 Config.js，校验语法与模块解析
npm run build   # 打包生成 BidiTranslate.popclipextz
```

> 本仓库约定：先本地测试 → 生成 `.popclipextz` 人工验证 → 确认后才 `git commit && git push`。

### 人工验证清单（装好后逐项点一遍）

- [ ] 选中中文 → **翻译**：得到英文，点预览可粘贴
- [ ] 选中英文 → **翻译**：得到中文
- [ ] **翻译并替换**：在输入框里替换原文
- [ ] **备选译法**：弹出多个译法且复制到剪贴板
- [ ] 更多 → **朗读原文 / 朗读译文**（首次需授予自动化权限）
- [ ] 更多 → **双语对照**
- [ ] 更多 → **语言学习卡**
- [ ] 更多 → **命名风格 → camelCase** 等
- [ ] 更多 → **模型对比**（需先填“对比：第二个模型”）
- [ ] 更多 → **自定义动作**

## 更新日志

- **v12.4**：修正 StepFun 默认地址为标准的 `https://api.stepfun.com/v1`（原 `/step_plan/v1` 仅适用于 Step Plan 订阅）；README 补充「模型选择」说明。
- **v12.3**：补齐 `popclipVersion: 6221`（子菜单 / `$` 命令需 2026.8.1+）、模型下拉新增 `deepseek-chat` / `deepseek-reasoner` / `qwen-turbo`、`model` 与 `model2` 显式 `defaultValue: ""`、「模型对比」新增“两个模型相同”的拦截提示；版本号全线统一（`package.json` / README）；新增 `npm run build` 打包脚本（自动排除 `.DS_Store`）。
- **v12.2**：合并定稿——新增 `modelFits()`（选了别家模型时自动回退到当前预设默认模型）、模型下拉改用 `allowNone`、更全的越南语/法语识别、朗读译文按 VOICE 判断目标语音；单测增至 93 项。
- **v12.1**：模型下拉（`allowOther` 可手填）、目标语言可自由填写（如 Traditional Chinese/Cantonese）、新增「译成…」子菜单、朗读语速、学习卡方向自动翻转；**修复 `restorePasteboard` 拼写错误**、删除未使用的 `HAN`。
- **v11.1**：合并 v11 的改进——朗读改用 `$` shell（免自动化授权）、新增 `detectSourceKey` 按语言选朗读语音、命名风格改用专用提示词、`toWords` 修正缩写边界、`provider2` 跨厂商不再复用第一个 Key（必须填第二个）；修复「同一预设 + 自定义代理」被误判为跨厂商；补齐单元测试（68 项）。
- **v10.1**：纯逻辑抽到 `lib.js`，新增 Node 单元测试（`npm test`）与 PopClip 加载测试（`npm run load`）；行为不变。
- **v10**：新增「更多」子菜单——朗读原文/译文、双语对照、语言学习卡、命名风格、模型对比、自定义动作。
- **v9.2**：按模型名安全注入“关闭思考”；自定义 Base URL 时不再注入；更新预设模型名。
- **v9.1**：布尔选项显式 `defaultValue: true`；修复引号剥离误伤。
- **v9**：关闭思考改为布尔开关；备选译法复制 + 全屏大字显示。
- **v8**：备选译法用 Large Type 完整显示。
- **v7**：多语言目标（源语言交给模型识别）。
- **v6**：DeepSeek 默认模型改为 `deepseek-flash`。
- **v5**：修复空 `excludedApps` 导致安装失败。
- **v4**：移除 Qwen-MT 分支；新增备选译法与按 App 禁用。

## License

[MIT](LICENSE)
