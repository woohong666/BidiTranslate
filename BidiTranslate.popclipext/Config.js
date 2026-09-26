// #popclip
// name: 双向翻译
// identifier: com.woohong.popclip.bidi-translate
// icon: symbol:character.book.closed
// entitlements: [network, script]
// popclipVersion: 6221
// description: 多语言 AI 翻译：自动识别翻译方向、流式显示、备用模型、长文本分段、OpenCode Go 多协议模型、朗读、学习卡与自定义动作。

import axios from "axios";
import {
  PRESETS, VOICE, HAS_LETTER, NAMING_PROMPT, MODEL_VALUES, MODEL_LABELS,
  DEFAULT_MAX_INPUT_CHARS, characterCount, guardInput, maxCharsOf, splitTextByLimit,
  thinkOffFor, protocolFor, detectSourceKey, targetKeyOf, resolveLearningTarget,
  buildPrompt, buildLearningPrompt, cleanOutput, parseExtraBody,
  provider1, provider2, toNaming,
} from "./lib.js";

// 按 App 禁用（静态）：填入 bundle id 后 PopClip 在这些 App 不显示本扩展。
const excludedApps = [];

function tokenInfo(usage) {
  if (!usage || typeof usage !== "object") return "";
  const total = Number(usage.total_tokens);
  if (Number.isFinite(total) && total > 0) return "" + total;
  const input = Number(usage.prompt_tokens ?? usage.input_tokens);
  const output = Number(usage.completion_tokens ?? usage.output_tokens);
  if (Number.isFinite(input) || Number.isFinite(output)) {
    return (Number.isFinite(input) ? input : "?") + "+" + (Number.isFinite(output) ? output : "?");
  }
  return "";
}

const options = [
  { type: "heading", identifier: "translationHeading", label: "翻译" },
  { identifier: "preset", type: "multiple", label: "接口预设",
    values: ["deepseek", "qwen", "zhipu", "kimi", "stepfun", "openai", "opencodego", "custom"],
    valueLabels: ["DeepSeek API（V4.1 Flash 默认）", "通义千问 Qwen", "智谱 GLM", "Kimi / Moonshot", "StepFun", "OpenAI", "OpenCode Go（实验）", "自定义"],
    defaultValue: "deepseek",
    description: "OpenCode Go 是实验性翻译接口；官方主要面向编程代理，翻译场景不保证可用。" },
  { identifier: "apikey", type: "secret", label: "API Key", description: "密钥保存在 macOS 钥匙串。OpenCode Go 请填 OpenCode Console 生成的 Go API Key。" },
  { identifier: "modelChoice", migrateFrom: "model", type: "multiple", label: "模型", allowNone: true, allowOther: true,
    values: MODEL_VALUES, valueLabels: MODEL_LABELS, defaultValue: "deepseek-flash",
    description: "默认 DeepSeek V4.1 Flash（API 模型名 deepseek-flash）；OpenCode Go 仅列出 Chat Completions 兼容模型；选“None”使用当前预设默认模型，“Other…”可手填兼容模型 ID。" },
  { identifier: "baseurl", type: "string", label: "自定义 Base URL / 代理（可选）", description: "留空用预设地址。填写后会按自定义地址发送，适合兼容 API / 代理。" },
  { identifier: "goprotocol", type: "multiple", label: "OpenCode Go 协议",
    values: ["auto", "chat", "responses", "anthropic"],
    valueLabels: ["自动识别", "Chat Completions", "Responses", "Anthropic Messages"],
    defaultValue: "auto",
    description: "通常保持自动。使用 Go 的 Other…模型时，可手动指定它的 API 协议。" },
  { identifier: "target", type: "multiple", label: "目标语言",
    values: ["auto", "zh", "en", "ja", "ko", "ru", "fr", "de", "es", "pt", "it", "ar", "th", "vi"],
    valueLabels: ["自动（中文→英文，其它→中文）", "中文", "English", "日本語", "한국어", "Русский", "Français", "Deutsch", "Español", "Português", "Italiano", "العربية", "ไทย", "Tiếng Việt"],
    allowOther: true, defaultValue: "auto",
    description: "也可点“其它…”自由输入语言名，如 Traditional Chinese、Cantonese、Latin。" },
  { identifier: "tone", type: "multiple", label: "语气 / 领域",
    values: ["general", "tech", "formal", "casual", "marketing", "academic"],
    valueLabels: ["通用（默认）", "技术", "正式书面", "日常口语", "营销文案", "学术"], defaultValue: "general" },
  { identifier: "variantcount", type: "multiple", label: "备选译法数量",
    values: ["2", "3", "4"], valueLabels: ["2 个", "3 个（默认）", "4 个"], defaultValue: "3" },

  { type: "heading", identifier: "qualityHeading", label: "高级 / 质量" },
  { identifier: "disablethinking", type: "boolean", label: "关闭思考模式（更快）", defaultValue: true,
    description: "默认勾选。各模型按能力关闭思考或降为 low；GLM-5.3 / Flash 不支持关闭思考，会自动使用 low。自定义 Base URL 不注入参数。" },
  { identifier: "streaming", type: "boolean", label: "流式显示结果", defaultValue: true,
    description: "翻译生成过程中逐步更新 PopClip 预览；不支持流式的接口会自动回退为完整响应。粘贴仍在完整结果返回后执行。" },
  { identifier: "fallback", type: "boolean", label: "主接口失败时使用备用接口", defaultValue: false,
    description: "启用后，主接口遇到限流、超时或 5xx 时，使用“第二个预设 / 模型”重试。需要配置第二个 API Key；可能产生额外用量。" },
  { identifier: "chunklong", type: "boolean", label: "长文本自动分段翻译", defaultValue: true,
    description: `超过每次请求上限（默认 ${DEFAULT_MAX_INPUT_CHARS} 字符）时按段翻译并合并。会产生多次请求；“备选译法”和模型对比不自动分段。` },
  { identifier: "temperature", type: "string", label: "Temperature", description: "默认 0.3；留空则不发送。部分自定义模型不接受时可清空。", defaultValue: "0.3" },
  { identifier: "maxchars", type: "string", label: "最大输入字符数", description: `用于防止一次选中超长文本导致请求过大或等待过久。默认 ${DEFAULT_MAX_INPUT_CHARS}；填 0 表示不限制。`, defaultValue: String(DEFAULT_MAX_INPUT_CHARS) },
  { identifier: "glossary", type: "string", multiline: true, label: "术语表 / 额外要求",
    description: "可选，每行一条。例如：Xray、Reality、VLESS 保持英文不翻译；“机场”译为 proxy provider。" },
  { identifier: "extrabody", type: "string", multiline: true, label: "额外请求参数 (JSON，可选)",
    description: '高级用法。可写 top_p、max_tokens、max_output_tokens、reasoning_effort 等；不能覆盖基础输入、model、messages、stream。' },

  { type: "heading", identifier: "speechHeading", label: "朗读" },
  { identifier: "voice", type: "string", label: "朗读语音（可选）",
    description: "留空按语言自动选择；也可填 macOS 中其它语音名，如 Meijia、Daniel。" },
  { identifier: "speakrate", type: "string", label: "朗读语速（可选）", description: "每分钟字数，约 120～220；留空使用系统默认。" },

  { type: "heading", identifier: "compareHeading", label: "模型对比" },
  { identifier: "preset2", type: "multiple", label: "第二个预设",
    values: ["same", "deepseek", "qwen", "zhipu", "kimi", "stepfun", "openai", "opencodego"],
    valueLabels: ["与当前相同（只比模型）", "DeepSeek", "通义 Qwen", "智谱 GLM", "Kimi", "StepFun", "OpenAI", "OpenCode Go（实验）"],
    defaultValue: "same" },
  { identifier: "apikey2", type: "secret", label: "第二个 API Key（可选）", description: "跨厂商对比时才需要；不会把第一个厂商的 Key 发送给第二家。" },
  { identifier: "model2", type: "multiple", label: "第二个模型", allowNone: true, allowOther: true,
    values: MODEL_VALUES, valueLabels: MODEL_LABELS, defaultValue: "",
    description: "用于模型对比，也可作为备用模型；同厂商请选与当前不同的模型，跨厂商时选“None”可使用第二个预设默认模型。" },

  { type: "heading", identifier: "customHeading", label: "自定义动作" },
  { identifier: "customprompt", type: "string", multiline: true, label: "自定义动作提示词",
    description: "“更多 → 自定义动作”使用的系统提示词，例如润色、解释、总结、改写成邮件。",
    defaultValue: "请把下面的文字润色得更通顺自然，保持原意，只输出结果：" },
];

// ---- 核心请求 ----
function errorMessage(e) {
  return e && e.message ? e.message : String(e || "请求失败");
}

function responseStatus(e) {
  return e && e.response ? Number(e.response.status) : 0;
}

function retryableError(e) {
  const status = responseStatus(e);
  return !status || [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
}

function settingsError(e) {
  const message = errorMessage(e);
  return /^settings error|^not signed in|API Key 无效|API Key 无权限/i.test(message);
}

function responseDetail(e) {
  const r = e && e.response;
  if (!r) return "请求失败：" + errorMessage(e);
  const detail = (r.data && r.data.error && (r.data.error.message || r.data.error)) || (r.data && r.data.message) || "";
  return "HTTP " + r.status + (detail ? "：" + detail : "");
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      return item.text || item.content || item.output_text || "";
    }).join("");
  }
  return content && typeof content === "object"
    ? String(content.text || content.content || content.output_text || "") : "";
}

function responseText(data, protocol) {
  if (!data || typeof data !== "object") return "";
  if (protocol === "chat") {
    const message = data.choices && data.choices[0] && data.choices[0].message;
    return contentText(message && message.content);
  }
  if (protocol === "responses") {
    if (typeof data.output_text === "string") return data.output_text;
    const output = Array.isArray(data.output) ? data.output : [];
    return output.map(item => contentText(item && item.content)).join("");
  }
  const content = Array.isArray(data.content) ? data.content : [];
  return content.map(item => contentText(item)).join("");
}

function streamDelta(data, protocol) {
  if (!data || typeof data !== "object") return "";
  if (protocol === "chat") {
    const delta = data.choices && data.choices[0] && data.choices[0].delta;
    return contentText(delta && delta.content);
  }
  if (protocol === "responses") {
    return data.type === "response.output_text.delta" || data.type === "output_text.delta"
      ? String(data.delta || "") : "";
  }
  return data.type === "content_block_delta" && data.delta
    ? String(data.delta.text || "") : "";
}

function protocolEndpoint(base, protocol) {
  if (protocol === "responses") return base + "/responses";
  if (protocol === "anthropic") return base + "/messages";
  return base + "/chat/completions";
}

function requestHeaders(p, protocol) {
  const headers = { "Content-Type": "application/json" };
  if (p.presetName === "opencodego" && protocol === "anthropic") {
    headers["x-api-key"] = p.key;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = "Bearer " + p.key;
  }
  if (p.presetName === "opencodego") {
    // Each PopClip translation is a one-request conversation; identify the client truthfully.
    headers["User-Agent"] = "BidiTranslate-PopClip/15.0";
    headers["x-opencode-session"] = util.randomUuid();
  }
  return headers;
}

function requestBody(messages, p, options, protocol, streaming) {
  const system = messages.filter(m => m.role === "system").map(m => contentText(m.content)).join("\n\n");
  const user = messages.filter(m => m.role !== "system");
  const body = { model: p.model, stream: streaming };
  if (protocol === "responses") {
    body.instructions = system;
    body.input = user.length === 1 ? contentText(user[0].content) : user.map(m => ({ role: m.role, content: contentText(m.content) }));
  } else if (protocol === "anthropic") {
    body.max_tokens = 4096;
    if (system) body.system = system;
    body.messages = user.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: contentText(m.content) }));
  } else {
    body.messages = messages;
  }
  if (protocol === "chat" && options.disablethinking !== false && !p.usingCustomBase) {
    const off = thinkOffFor(p.model);
    if (off) Object.assign(body, off);
  }
  const temp = parseFloat(options.temperature);
  if (!isNaN(temp)) body.temperature = temp;
  Object.assign(body, parseExtraBody(options.extrabody));
  return body;
}

function parseJson(value) {
  try { return JSON.parse(value); } catch (_) { return null; }
}

function httpError(status, data) {
  const e = new Error("HTTP " + status);
  e.response = { status, data };
  return e;
}

// XHR 的 readyState=3 会逐步更新 responseText；用它解析 SSE，避免依赖浏览器/Node stream。
function postStreaming(url, body, headers, protocol, onDelta) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let offset = 0;
    let pending = "";
    let lastData = null;
    let collected = "";
    let settled = false;

    const fail = error => { if (!settled) { settled = true; reject(error); } };
    const consumeLine = line => {
      if (!line || !line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      const data = parseJson(payload);
      if (!data) return;
      lastData = data;
      const delta = streamDelta(data, protocol);
      if (delta) { collected += delta; onDelta(delta); }
    };
    const consume = final => {
      const raw = xhr.responseText || "";
      const delta = raw.slice(offset);
      offset = raw.length;
      pending += delta;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || "";
      lines.forEach(consumeLine);
      if (final && pending) consumeLine(pending);
      return raw;
    };

    xhr.open("POST", url, true);
    xhr.timeout = 45000;
    Object.keys(headers).forEach(key => xhr.setRequestHeader(key, headers[key]));
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3) consume(false);
      if (xhr.readyState !== 4) return;
      const raw = consume(true);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!lastData) lastData = parseJson(raw.trim());
        if (!settled) { settled = true; resolve({ data: lastData, collected }); }
      } else {
        fail(httpError(xhr.status, parseJson(raw.trim()) || raw));
      }
    };
    xhr.onerror = () => fail(new Error("网络请求失败"));
    xhr.ontimeout = () => fail(new Error("请求超时"));
    xhr.onabort = () => fail(new Error("请求已取消"));
    try { xhr.send(JSON.stringify(body)); } catch (e) { fail(e); }
  });
}

async function sendRequest(body, p, protocol, streaming, onDelta) {
  const url = protocolEndpoint(p.base, protocol);
  const headers = requestHeaders(p, protocol);
  if (streaming) return postStreaming(url, body, headers, protocol, onDelta);
  return axios.post(url, body, { headers, timeout: 45000 });
}

async function chatDetailed(messages, p, options) {
  if (!p.key) throw popclip.settingsRequiredError();
  if (!p.base) throw popclip.settingsRequiredError("请填写接口预设，或填写“自定义 Base URL”");
  if (!p.model) throw popclip.settingsRequiredError("请填写“模型”，或选一个有默认模型的接口预设");

  const protocol = protocolFor(p.presetName, p.model, options.goprotocol);
  let streaming = options.streaming === true;
  let body = requestBody(messages, p, options, protocol, streaming);
  const started = Date.now();
  let attempts = 0;
  let result;
  let collected = "";
  const showPartial = delta => {
    collected += delta;
    if (collected && streaming) popclip.showText(collected, { style: "compact", preview: false });
  };

  while (attempts < 2) {
    try {
      result = await sendRequest(body, p, protocol, streaming, showPartial);
      break;
    } catch (e) {
      const status = responseStatus(e);
      // Some compatible proxies reject stream=true. Retry once as a normal request.
      if (streaming && [400, 404, 405, 422].includes(status)) {
        streaming = false;
        body = requestBody(messages, p, options, protocol, false);
        continue;
      }
      if (status === 401 || status === 403) throw popclip.settingsRequiredError("API Key 无效或无权限");
      attempts++;
      if (attempts >= 2 || !retryableError(e)) throw new Error(responseDetail(e));
      collected = "";
      await sleep(350 * attempts);
    }
  }

  const out = cleanOutput(responseText(result && result.data, protocol) || (result && result.collected) || collected);
  if (!out) throw new Error("接口返回为空，请检查预设/模型/Base URL，或关闭思考模式");
  return {
    text: out,
    elapsedMs: Date.now() - started,
    tokens: tokenInfo(result && result.data && result.data.usage),
  };
}

async function chat(messages, p, options) {
  try {
    return (await chatDetailed(messages, p, options)).text;
  } catch (primaryError) {
    if (options.fallback !== true || settingsError(primaryError)) throw primaryError;
    const backup = provider2(options);
    if (!backup.key || !backup.model || (backup.base === p.base && backup.model === p.model)) throw primaryError;
    try {
      return (await chatDetailed(messages, backup, options)).text;
    } catch (backupError) {
      throw new Error("主接口失败：" + errorMessage(primaryError) + "；备用接口也失败：" + errorMessage(backupError));
    }
  }
}

function translateMessages(text, targetKey, options, variants) {
  return [
    { role: "system", content: buildPrompt(targetKey, options.tone, options.glossary, variants) },
    { role: "user", content: text },
  ];
}

async function translateOne(text, options, variants, targetOverride) {
  if (!HAS_LETTER.test(text)) return text;
  return chat(translateMessages(text, targetKeyOf(options, targetOverride), options, variants), provider1(options), options);
}

async function runTranslate(text, options, variants, targetOverride) {
  const raw = String(text ?? "");
  if (!options.apikey) throw popclip.settingsRequiredError();
  const limit = maxCharsOf(options.maxchars);
  const length = characterCount(raw);
  if (limit > 0 && length > limit && options.chunklong === true && variants === 1) {
    const chunks = splitTextByLimit(raw, limit);
    const translated = [];
    for (const chunk of chunks) translated.push(await translateOne(chunk, options, 1, targetOverride));
    // Models trim leading/trailing line breaks; one separator keeps paragraph chunks readable.
    return translated.join("\n");
  }
  const t = guardInput(raw, limit);
  return translateOne(t, options, variants, targetOverride);
}

// ---- 朗读（macOS say） ----
async function speak(text, voice, rate) {
  const v = String(voice || "").trim();
  const r = parseInt(rate, 10);
  const extra = r > 0 ? ["-r", String(r)] : [];
  if (v) {
    try {
      await $`printf '%s' ${text} | /usr/bin/say -v ${v} ${extra} -f -`;
      return;
    } catch (e) {
      if (e && e.terminationReason === "uncaughtSignal") throw e;
    }
  }
  await $`printf '%s' ${text} | /usr/bin/say ${extra} -f -`;
}

// ---- 命名风格 ----
async function runNaming(text, options, style) {
  const t = guardInput(text, maxCharsOf(options.maxchars));
  if (!options.apikey) throw popclip.settingsRequiredError();
  if (!HAS_LETTER.test(t)) return t;
  let prompt = NAMING_PROMPT;
  const g = String(options.glossary || "").trim();
  if (g) prompt += "\nGlossary / extra instructions (follow strictly):\n" + g;
  const words = await chat([{ role: "system", content: prompt }, { role: "user", content: t }], provider1(options), options);
  return toNaming(words, style);
}

// ---- 自定义动作 ----
async function customAction(text, options) {
  const t = guardInput(text, maxCharsOf(options.maxchars));
  const prompt = String(options.customprompt || "").trim() || "请把下面的文字润色得更通顺自然，保持原意，只输出结果：";
  return chat([{ role: "system", content: prompt }, { role: "user", content: t }], provider1(options), options);
}

function formatModelStat(result) {
  const time = ((result.elapsedMs || 0) / 1000).toFixed(2) + "s";
  return result.tokens ? " · " + time + " · " + result.tokens + " tok" : " · " + time;
}

// ---- 模型对比 ----
async function compare(text, options) {
  const t = guardInput(text, maxCharsOf(options.maxchars));
  const p1 = provider1(options), p2 = provider2(options);
  if (!p1.key) throw popclip.settingsRequiredError();
  if (!p2.model) { popclip.showText("请先在设置里填写“第二个模型”"); return null; }
  if (p2.base === p1.base && p2.model === p1.model) {
    popclip.showText("第二个模型和当前模型一样，请另选一个"); return null;
  }
  if (!p2.key) { popclip.showText("跨厂商对比时，请填写“第二个 API Key”"); return null; }
  if (!HAS_LETTER.test(t)) return t;

  const tk = targetKeyOf(options);
  const compareOptions = Object.assign({}, options, { streaming: false });
  const run = async p => {
    const started = Date.now();
    try {
      const r = await chatDetailed(translateMessages(t, tk, options, 1), p, compareOptions);
      return { ...r, ok: true };
    } catch (e) {
      return { text: "（失败：" + (e && e.message ? e.message : "请检查该模型设置") + "）", elapsedMs: Date.now() - started, tokens: "", ok: false };
    }
  };
  const [a, b] = await Promise.all([run(p1), run(p2)]);
  return "① " + p1.model + formatModelStat(a) + "\n" + a.text + "\n\n② " + p2.model + formatModelStat(b) + "\n" + b.text;
}

async function showLarge(text) {
  await popclip.copyText(text);
  popclip.showText(text, { style: "large" });
}

async function showGoModels(options) {
  const base = PRESETS.opencodego.baseurl;
  const key = options.preset === "opencodego" ? options.apikey
    : options.preset2 === "opencodego" ? options.apikey2 : "";
  try {
    const headers = { Accept: "application/json" };
    if (key) headers.Authorization = "Bearer " + key;
    const response = await axios.get(base + "/models", { headers, timeout: 15000 });
    const data = response.data && Array.isArray(response.data.data) ? response.data.data : [];
    const ids = data.map(item => typeof item === "string" ? item : item && item.id).filter(Boolean).sort();
    if (!ids.length) throw new Error("模型目录为空或返回格式不受支持");
    await showLarge("OpenCode Go 当前模型（实时）\n\n" + ids.join("\n") + "\n\n提示：模型是否支持 /chat/completions 仍以官方目录为准。可在设置的“模型”里用 Other…手动填写新 ID。");
  } catch (e) {
    throw new Error("读取 OpenCode Go 模型目录失败：" + errorMessage(e));
  }
}

const voiceOf = (options, key) => String(options.voice || "").trim() || VOICE[key] || "";

// “译成…”子菜单：一次性按指定目标语言翻译，不改设置里的“目标语言”。
const targetOpt = options.find(o => o.identifier === "target");
const translateToSubmenu = targetOpt.values.map((v, i) => ({
  title: targetOpt.valueLabels[i],
  after: "preview-result",
  code: (input, opts) => runTranslate(input.text, opts, 1, v),
}));

const moreSubmenu = [
  { title: "朗读原文", icon: "symbol:speaker.wave.2",
    code: async (input, options) => { await speak(input.text, voiceOf(options, detectSourceKey(input.text)), options.speakrate); } },
  { title: "朗读译文", icon: "symbol:speaker.wave.3",
    code: async (input, options) => {
      const t = await runTranslate(input.text, options, 1);
      const target = targetKeyOf(options) === "auto" ? detectSourceKey(t) : targetKeyOf(options);
      await speak(t, voiceOf(options, target), options.speakrate);
    } },
  { title: "译成…", icon: "symbol:character.textbox", submenu: translateToSubmenu },
  { title: "双语对照", icon: "symbol:rectangle.split.2x1",
    code: async (input, options) => {
      const t = await runTranslate(input.text, options, 1);
      await showLarge(t + "\n\n————— 原文 —————\n" + input.text);
    } },
  { title: "语言学习卡", icon: "symbol:graduationcap",
    code: async (input, options) => {
      const t = guardInput(input.text, maxCharsOf(options.maxchars));
      if (!options.apikey) throw popclip.settingsRequiredError();
      const tk = resolveLearningTarget(t, options.target);
      const out = await chat([{ role: "system", content: buildLearningPrompt(tk, options.target) }, { role: "user", content: t }], provider1(options), options);
      await showLarge(out);
    } },
  { title: "命名风格", icon: "symbol:chevron.left.forwardslash.chevron.right", submenu: [
      { title: "camelCase", requirements: ["paste"], after: "paste-result", restorePasteboard: true,
        code: async (input, options) => runNaming(input.text, options, "camel") },
      { title: "PascalCase", requirements: ["paste"], after: "paste-result", restorePasteboard: true,
        code: async (input, options) => runNaming(input.text, options, "pascal") },
      { title: "snake_case", requirements: ["paste"], after: "paste-result", restorePasteboard: true,
        code: async (input, options) => runNaming(input.text, options, "snake") },
      { title: "kebab-case", requirements: ["paste"], after: "paste-result", restorePasteboard: true,
        code: async (input, options) => runNaming(input.text, options, "kebab") },
    ] },
  { title: "模型对比", icon: "symbol:arrow.left.arrow.right",
    code: async (input, options) => { const out = await compare(input.text, options); if (out) await showLarge(out); } },
  { title: "Go 模型目录", icon: "symbol:list.bullet.rectangle",
    code: async (input, options) => { await showGoModels(options); } },
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
