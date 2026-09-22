// #popclip
// name: 双向翻译
// identifier: com.woohong.popclip.bidi-translate
// icon: symbol:character.book.closed
// entitlements: [network, script]
// popclipVersion: 6221
// description: 多语言翻译：自动识别源语言，中文↔英文，其它语言译成中文，也可指定目标语言。支持朗读、双语对照、学习卡、命名风格、模型对比与自定义 AI 动作。

import axios from "axios";
import {
  PRESETS, TARGETS, VOICE, HAS_LETTER, NAMING_PROMPT, MODEL_VALUES, MODEL_LABELS,
  thinkOffFor, detectSourceKey, targetKeyOf, resolveLearningTarget,
  buildPrompt, buildLearningPrompt, cleanOutput, parseExtraBody,
  provider1, provider2, toNaming,
} from "./lib.js";

// 按 App 禁用（静态）：填入 bundle id 后 PopClip 在这些 App 不显示本扩展。
// 示例：const excludedApps = ["com.apple.Terminal", "com.microsoft.VSCode"];
// 只想在指定 App 显示则改用 requiredApps。留空不要传给 PopClip（会报错）。
const excludedApps = [];

const options = [
  { identifier: "preset", type: "multiple", label: "接口预设",
    values: ["deepseek", "qwen", "zhipu", "kimi", "stepfun", "openai", "custom"],
    valueLabels: ["DeepSeek（默认·自然便宜）", "通义千问 Qwen（中文语感好）", "智谱 GLM（glm-4.5-flash 免费）", "Kimi / Moonshot", "StepFun", "OpenAI", "自定义（用下面的 URL/模型）"],
    defaultValue: "deepseek" },
  { identifier: "apikey", type: "secret", label: "API Key", description: "密钥保存在 macOS 钥匙串。" },
  { identifier: "model", type: "multiple", label: "模型", allowNone: true, allowOther: true,
    values: MODEL_VALUES, valueLabels: MODEL_LABELS, defaultValue: "",
    description: "选“None”= 用当前接口预设的默认模型（推荐）。列表里没有的模型，选“Other…”手动填写。若所选模型属于别的预设，会自动改用当前预设的默认模型。" },
  { identifier: "baseurl", type: "string", label: "自定义 Base URL（可选）", description: "仅当「接口预设」选“自定义”时填。填了与预设不同的地址就按自定义处理，不注入关闭思考的参数。" },
  { identifier: "target", type: "multiple", label: "目标语言", allowOther: true,
    values: ["auto", "zh", "en", "ja", "ko", "ru", "fr", "de", "es", "pt", "it", "ar", "th", "vi"],
    valueLabels: ["自动（中文→英文，其它→中文）", "中文", "English", "日本語", "한국어", "Русский", "Français", "Deutsch", "Español", "Português", "Italiano", "العربية", "ไทย", "Tiếng Việt"],
    description: "也可点“其它…”自由输入语言名，如 Traditional Chinese、Cantonese、Latin。",
    defaultValue: "auto" },
  { identifier: "tone", type: "multiple", label: "语气 / 领域",
    values: ["general", "tech", "formal", "casual", "marketing", "academic"],
    valueLabels: ["通用（默认）", "技术", "正式书面", "日常口语", "营销文案", "学术"], defaultValue: "general" },
  { identifier: "variantcount", type: "multiple", label: "备选译法数量",
    values: ["2", "3", "4"], valueLabels: ["2 个", "3 个（默认）", "4 个"], defaultValue: "3" },
  { identifier: "disablethinking", type: "boolean", label: "关闭思考模式（更快）", defaultValue: true,
    description: "翻译不需要推理链。仅当模型名明确支持时才注入：deepseek-flash/pro/v4*、glm-4.5~5* 用 thinking，qwen3* 用 enable_thinking；旧模型或其它厂商自动跳过。" },
  { identifier: "temperature", type: "string", label: "Temperature", description: "默认 0.3。留空则不发送该参数。", defaultValue: "0.3" },
  { identifier: "glossary", type: "string", multiline: true, label: "术语表 / 额外要求",
    description: "可选，会原样加入提示词。每行一条，例如：\nXray、Reality、VLESS 保持英文不翻译\n“机场”译为 proxy provider" },
  { identifier: "voice", type: "string", label: "朗读语音（可选）",
    description: "留空按语言自动选择（中文 Tingting、英文 Samantha…）。也可填系统里的其它语音名，如 Meijia、Daniel。" },
  { identifier: "speakrate", type: "string", label: "朗读语速（可选）",
    description: "每分钟字数，约 120（慢）～220（快）。留空用系统默认（约 175）。" },
  { identifier: "customprompt", type: "string", multiline: true, label: "自定义动作提示词",
    description: "“更多 → 自定义动作”用的系统提示词。例如润色、解释、总结、改写成邮件。",
    defaultValue: "请把下面的文字润色得更通顺自然，保持原意，只输出结果：" },
  { identifier: "preset2", type: "multiple", label: "对比：第二个预设",
    values: ["same", "deepseek", "qwen", "zhipu", "kimi", "stepfun", "openai"],
    valueLabels: ["与当前相同（只比模型）", "DeepSeek", "通义 Qwen", "智谱 GLM", "Kimi", "StepFun", "OpenAI"],
    defaultValue: "same" },
  { identifier: "apikey2", type: "secret", label: "对比：第二个 API Key（可选）", description: "当第二个预设与当前不同、且密钥不同时才需要。" },
  { identifier: "model2", type: "multiple", label: "对比：第二个模型", allowNone: true, allowOther: true,
    values: MODEL_VALUES, valueLabels: MODEL_LABELS, defaultValue: "",
    description: "“模型对比”里要对比的另一个模型。同一厂商必须选一个与当前不同的；跨厂商时选“None”则用第二个预设的默认模型。" },
  { identifier: "extrabody", type: "string", multiline: true, label: "额外请求参数 (JSON，可选)", description: '高级用法，合并进请求体。一般留空。例如 Qwen 关思考：\n{"enable_thinking": false}' },
];

// ---- 核心请求 ----
async function chat(messages, p, options) {
  if (!p.key) throw popclip.settingsRequiredError();
  if (!p.base) throw popclip.settingsRequiredError("请填写接口预设，或填写“自定义 Base URL”");
  if (!p.model) throw popclip.settingsRequiredError("请填写“模型”，或选一个有默认模型的接口预设");
  const body = { model: p.model, stream: false, messages };
  if (options.disablethinking !== false && !p.usingCustomBase) {
    const off = thinkOffFor(p.model);
    if (off) Object.assign(body, off);
  }
  const temp = parseFloat(options.temperature);
  if (!isNaN(temp)) body.temperature = temp;
  Object.assign(body, parseExtraBody(options.extrabody));

  let res;
  try {
    res = await axios.post(p.base + "/chat/completions", body, {
      headers: { Authorization: "Bearer " + p.key, "Content-Type": "application/json" }, timeout: 45000,
    });
  } catch (e) {
    const r = e && e.response;
    if (r) {
      if (r.status === 401 || r.status === 403) throw popclip.settingsRequiredError("API Key 无效或无权限");
      const detail = (r.data && r.data.error && (r.data.error.message || r.data.error)) || (r.data && r.data.message) || "";
      throw new Error("HTTP " + r.status + (detail ? "：" + detail : ""));
    }
    throw new Error("请求失败：" + (e && e.message ? e.message : e));
  }
  const msg = res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message;
  const out = msg && typeof msg.content === "string" ? cleanOutput(msg.content) : "";
  if (!out) throw new Error("接口返回为空，请检查预设/模型/Base URL，或关闭思考模式");
  return out;
}

function translateMessages(text, targetKey, options, variants) {
  return [
    { role: "system", content: buildPrompt(targetKey, options.tone, options.glossary, variants) },
    { role: "user", content: "<source>\n" + text + "\n</source>" },
  ];
}

async function runTranslate(text, options, variants, targetOverride) {
  if (!options.apikey) throw popclip.settingsRequiredError();
  if (!HAS_LETTER.test(text)) return text;
  return chat(translateMessages(text, targetKeyOf(options, targetOverride), options, variants), provider1(options), options);
}

// ---- 朗读（macOS say；用 $ shell 标签，无需 AppleScript 与自动化权限） ----
// 朗读期间 PopClip 显示转圈，点击转圈即可停止。
async function speak(text, voice, rate) {
  const v = String(voice || "").trim();
  const r = parseInt(rate, 10);
  const extra = r > 0 ? ["-r", String(r)] : [];
  if (v) {
    try {
      await $`printf '%s' ${text} | /usr/bin/say -v ${v} ${extra} -f -`;
      return;
    } catch (e) {
      if (e && e.terminationReason === "uncaughtSignal") throw e; // 用户点了转圈取消，不回退
      // 其它错误（如语音无效）回退到系统默认语音
    }
  }
  await $`printf '%s' ${text} | /usr/bin/say ${extra} -f -`;
}

// ---- 命名风格 ----
async function runNaming(text, options, style) {
  if (!options.apikey) throw popclip.settingsRequiredError();
  if (!HAS_LETTER.test(text)) return text;
  let prompt = NAMING_PROMPT;
  const g = String(options.glossary || "").trim();
  if (g) prompt += "\nGlossary / extra instructions (follow strictly):\n" + g;
  const words = await chat([{ role: "system", content: prompt }, { role: "user", content: "<source>\n" + text + "\n</source>" }], provider1(options), options);
  return toNaming(words, style);
}

// ---- 自定义动作 ----
async function customAction(text, options) {
  const prompt = String(options.customprompt || "").trim() || "请把下面的文字润色得更通顺自然，保持原意，只输出结果：";
  return chat([{ role: "system", content: prompt }, { role: "user", content: text }], provider1(options), options);
}

// ---- 模型对比（返回 null 表示配置不完整，已提示用户） ----
async function compare(text, options) {
  const p1 = provider1(options), p2 = provider2(options);
  if (!p1.key) throw popclip.settingsRequiredError();
  if (!p2.model) { popclip.showText("请先在设置里填写“对比：第二个模型”"); return null; }
  if (p2.base === p1.base && p2.model === p1.model) {
    popclip.showText("“对比：第二个模型”和当前模型一样，请在设置里另选一个"); return null;
  }
  if (!p2.key) { popclip.showText("对比的第二个预设与当前不同，请填写“对比：第二个 API Key”"); return null; }
  if (!HAS_LETTER.test(text)) return text;
  const tk = targetKeyOf(options);
  const run = p => chat(translateMessages(text, tk, options, 1), p, options)
    .then(v => v, e => "（失败：" + (e && e.message ? e.message : "请检查该模型的设置") + "）");
  const [a, b] = await Promise.all([run(p1), run(p2)]);
  return "① " + p1.model + "\n" + a + "\n\n② " + p2.model + "\n" + b;
}

async function showLarge(text) {
  await popclip.copyText(text);
  popclip.showText(text, { style: "large" });
}

const voiceOf = (options, key) => String(options.voice || "").trim() || VOICE[key] || "";

// “译成…”子菜单：一次性按指定目标语言翻译，不改设置里的“目标语言”。
const targetOpt = options.find(o => o.identifier === "target");
const translateToSubmenu = targetOpt.values.map((v, i) => v === "auto" ? null : ({
  title: targetOpt.valueLabels[i],
  after: "preview-result",
  code: (input, opts) => runTranslate(input.text, opts, 1, v),
})).filter(Boolean);

const moreSubmenu = [
  { title: "朗读原文", icon: "symbol:speaker.wave.2",
    code: async (input, options) => { await speak(input.text, voiceOf(options, detectSourceKey(input.text)), options.speakrate); } },
  { title: "朗读译文", icon: "symbol:speaker.wave.3",
    code: async (input, options) => {
      const t = await runTranslate(input.text, options, 1);
      const key = VOICE[options.target] ? options.target : detectSourceKey(t);
      await speak(t, voiceOf(options, key), options.speakrate);
    } },
  { title: "译成…", icon: "symbol:character.textbox",
    submenu: translateToSubmenu },
  { title: "双语对照", icon: "symbol:rectangle.split.2x1",
    code: async (input, options) => {
      const t = await runTranslate(input.text, options, 1);
      await showLarge(t + "\n\n————— 原文 —————\n" + input.text);
    } },
  { title: "语言学习卡", icon: "symbol:graduationcap",
    code: async (input, options) => {
      if (!options.apikey) throw popclip.settingsRequiredError();
      const tk = resolveLearningTarget(input.text, options.target);
      const out = await chat([{ role: "system", content: buildLearningPrompt(tk) }, { role: "user", content: "<source>\n" + input.text + "\n</source>" }], provider1(options), options);
      await showLarge(out);
    } },
  { title: "命名风格", icon: "symbol:chevron.left.forwardslash.chevron.right", submenu: [
      { title: "camelCase",  after: "paste-result", restorePasteboard: true, code: async (input, options) => runNaming(input.text, options, "camel") },
      { title: "PascalCase", after: "paste-result", restorePasteboard: true, code: async (input, options) => runNaming(input.text, options, "pascal") },
      { title: "snake_case", after: "paste-result", restorePasteboard: true, code: async (input, options) => runNaming(input.text, options, "snake") },
      { title: "kebab-case", after: "paste-result", restorePasteboard: true, code: async (input, options) => runNaming(input.text, options, "kebab") },
    ] },
  { title: "模型对比", icon: "symbol:arrow.left.arrow.right",
    code: async (input, options) => { const out = await compare(input.text, options); if (out) await showLarge(out); } },
  { separator: true },
  { title: "自定义动作", icon: "symbol:wand.and.stars", after: "preview-result",
    code: async (input, options) => customAction(input.text, options) },
];

const extension = {
  options,
  actions: [
    { title: "翻译", icon: "symbol:character.book.closed", after: "preview-result",
      code: async (input, options) => runTranslate(input.text, options, 1) },
    { title: "翻译并替换", icon: "symbol:character.cursor.ibeam", requirements: ["paste"], after: "paste-result", restorePasteboard: true,
      code: async (input, options) => runTranslate(input.text, options, 1) },
    { title: "备选译法", icon: "symbol:list.number",
      code: async (input, options) => {
        const out = await runTranslate(input.text, options, parseInt(options.variantcount, 10) || 3);
        await showLarge(out);
      } },
    { title: "更多", icon: "symbol:ellipsis.circle", submenu: moreSubmenu },
  ],
};

if (excludedApps.length) extension.excludedApps = excludedApps;

defineExtension(extension);
