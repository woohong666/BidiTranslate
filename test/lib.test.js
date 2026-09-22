// 纯逻辑单元测试 + Config.js 静态检查：node test/lib.test.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PRESETS, TARGETS, NAMING_PROMPT, MODELS, MODEL_VALUES, MODEL_LABELS, modelFits,
  thinkOffFor, detectTargetKey, detectSourceKey,
  targetName, targetKeyOf, resolveLearningTarget,
  buildPrompt, buildLearningPrompt, cleanOutput, parseExtraBody,
  provider1, provider2, toNaming, toWords, HAS_LETTER,
} from "../BidiTranslate.popclipext/lib.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configSrc = readFileSync(join(root, "BidiTranslate.popclipext", "Config.js"), "utf8");

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log("  ok   " + name); }
  catch (e) { fail++; console.log("  FAIL " + name + "\n       " + (e && e.message)); }
}

console.log("\nthinkOffFor");
t("deepseek-flash -> thinking disabled", () => assert.deepEqual(thinkOffFor("deepseek-flash"), { thinking: { type: "disabled" } }));
t("deepseek-v4-pro -> thinking disabled", () => assert.deepEqual(thinkOffFor("deepseek-v4-pro"), { thinking: { type: "disabled" } }));
t("deepseek-chat (旧) -> null", () => assert.equal(thinkOffFor("deepseek-chat"), null));
t("deepseek-reasoner -> null", () => assert.equal(thinkOffFor("deepseek-reasoner"), null));
t("glm-4.5-flash -> thinking disabled", () => assert.deepEqual(thinkOffFor("glm-4.5-flash"), { thinking: { type: "disabled" } }));
t("glm-5.3 -> thinking disabled", () => assert.deepEqual(thinkOffFor("glm-5.3"), { thinking: { type: "disabled" } }));
t("glm-4-flash (旧) -> null", () => assert.equal(thinkOffFor("glm-4-flash"), null));
t("qwen3.6-flash -> enable_thinking false", () => assert.deepEqual(thinkOffFor("qwen3.6-flash"), { enable_thinking: false }));
t("qwen-plus -> null", () => assert.equal(thinkOffFor("qwen-plus"), null));

console.log("\nMODELS / modelFits");
t("MODEL_VALUES 与 LABELS 等长", () => assert.equal(MODEL_VALUES.length, MODEL_LABELS.length));
t("MODELS 含 deepseek-flash", () => assert.ok(MODEL_VALUES.includes("deepseek-flash")));
t("deepseek-flash 属于 deepseek", () => assert.equal(modelFits("deepseek-flash", "deepseek"), true));
t("deepseek-flash 不属于 qwen", () => assert.equal(modelFits("deepseek-flash", "qwen"), false));
t("列表外的模型一律 fits", () => assert.equal(modelFits("my-own-model", "qwen"), true));

console.log("\ndetectTargetKey（该译成什么）");
t("中文 -> en", () => assert.equal(detectTargetKey("你好世界", "auto"), "en"));
t("英文 -> zh", () => assert.equal(detectTargetKey("Hello world", "auto"), "zh"));
t("日文 -> zh", () => assert.equal(detectTargetKey("こんにちは世界", "auto"), "zh"));
t("韩文 -> zh", () => assert.equal(detectTargetKey("안녕하세요", "auto"), "zh"));
t("俄文 -> zh", () => assert.equal(detectTargetKey("Привет мир", "auto"), "zh"));
t("英文里夹一个中文名 -> zh", () => assert.equal(detectTargetKey("Open the 微信 app", "auto"), "zh"));
t("固定目标优先", () => assert.equal(detectTargetKey("你好", "ja"), "ja"));

console.log("\ndetectSourceKey（文本本身是什么语言）");
t("中文 -> zh", () => assert.equal(detectSourceKey("你好"), "zh"));
t("英文 -> en", () => assert.equal(detectSourceKey("Hello world"), "en"));
t("日文 -> ja", () => assert.equal(detectSourceKey("こんにちは"), "ja"));
t("韩文 -> ko", () => assert.equal(detectSourceKey("안녕하세요"), "ko"));
t("俄文 -> ru", () => assert.equal(detectSourceKey("Привет"), "ru"));
t("阿拉伯文 -> ar", () => assert.equal(detectSourceKey("مرحبا"), "ar"));
t("泰文 -> th", () => assert.equal(detectSourceKey("สวัสดี"), "th"));
t("德文(ö/ß) -> de", () => assert.equal(detectSourceKey("Größe"), "de"));
t("法文(é) -> fr", () => assert.equal(detectSourceKey("café"), "fr"));
t("西文(ñ) -> es", () => assert.equal(detectSourceKey("mañana"), "es"));
t("葡文(ã) -> pt", () => assert.equal(detectSourceKey("não"), "pt"));
t("越文(đ) -> vi", () => assert.equal(detectSourceKey("đường"), "vi"));
t("越文(带调 ệ) -> vi", () => assert.equal(detectSourceKey("Tiếng Việt"), "vi"));
t("纯符号 -> 空", () => assert.equal(detectSourceKey("123 !!! ——"), ""));

console.log("\ntargetName / targetKeyOf");
t("预设语言名", () => assert.equal(targetName("en"), "English"));
t("自由语言名原样返回", () => assert.equal(targetName("Cantonese"), "Cantonese"));
t("targetKeyOf: override 优先", () => assert.equal(targetKeyOf({ target: "zh" }, "en"), "en"));
t("targetKeyOf: auto", () => assert.equal(targetKeyOf({ target: "auto" }), "auto"));
t("targetKeyOf: 自由语言名", () => assert.equal(targetKeyOf({ target: "Traditional Chinese" }), "Traditional Chinese"));

console.log("\nresolveLearningTarget（学习卡方向）");
t("中文 + auto -> en", () => assert.equal(resolveLearningTarget("你好", "auto"), "en"));
t("英文 + auto -> zh", () => assert.equal(resolveLearningTarget("hello", "auto"), "zh"));
t("中文 + target=zh -> 翻转为 en", () => assert.equal(resolveLearningTarget("你好", "zh"), "en"));
t("英文 + target=en -> 翻转为 zh", () => assert.equal(resolveLearningTarget("hello", "en"), "zh"));

console.log("\ncleanOutput");
t("剥普通引号", () => assert.equal(cleanOutput('"Hello world"'), "Hello world"));
t("不剥内部有引号的", () => assert.equal(cleanOutput('"A" and "B"'), '"A" and "B"'));
t("剥中文引号", () => assert.equal(cleanOutput("「你好」"), "你好"));
t("去 think 块", () => assert.equal(cleanOutput("<think>x</think>正常"), "正常"));
t("去 source 标签", () => assert.equal(cleanOutput("<source>hi</source>"), "hi"));
t("不误伤撇号", () => assert.equal(cleanOutput("don't stop"), "don't stop"));

console.log("\ntoWords / toNaming");
t("缩写边界 HTTPServerConfig", () => assert.deepEqual(toWords("HTTPServerConfig"), ["http", "server", "config"]));
t("camel", () => assert.equal(toNaming("User Login Name", "camel"), "userLoginName"));
t("pascal", () => assert.equal(toNaming("User Login Name", "pascal"), "UserLoginName"));
t("snake", () => assert.equal(toNaming("get user name", "snake"), "get_user_name"));
t("kebab", () => assert.equal(toNaming("get user name", "kebab"), "get-user-name"));
t("已是 snake 再转 camel", () => assert.equal(toNaming("get_user_name", "camel"), "getUserName"));
t("非字母原样返回", () => assert.equal(toNaming("！！！", "camel"), "！！！"));

console.log("\nparseExtraBody");
t("空 -> {}", () => assert.deepEqual(parseExtraBody(""), {}));
t("合法 JSON", () => assert.deepEqual(parseExtraBody('{"enable_thinking": false}'), { enable_thinking: false }));
t("数组非法 -> 抛错", () => assert.throws(() => parseExtraBody("[1,2]")));
t("坏 JSON -> 抛错", () => assert.throws(() => parseExtraBody("{bad}")));

console.log("\nprovider1");
t("默认 deepseek", () => {
  const p = provider1({ preset: "deepseek", apikey: "k" });
  assert.equal(p.base, "https://api.deepseek.com");
  assert.equal(p.model, "deepseek-flash");
  assert.equal(p.usingCustomBase, false);
});
t("同厂商模型生效", () => assert.equal(provider1({ preset: "deepseek", model: "deepseek-v4-pro" }).model, "deepseek-v4-pro"));
t("别家模型自动回退预设默认", () => assert.equal(provider1({ preset: "qwen", model: "deepseek-flash" }).model, "qwen-plus"));
t("自定义 Base URL 时不回退（代理可跨家）", () => {
  const p = provider1({ preset: "qwen", model: "deepseek-flash", baseurl: "https://proxy.example/v1" });
  assert.equal(p.model, "deepseek-flash");
  assert.equal(p.usingCustomBase, true);
});
t("自定义预设时不回退", () => assert.equal(provider1({ preset: "custom", model: "my-model" }).model, "my-model"));
t("自定义 baseurl 视为自定义", () => {
  const p = provider1({ preset: "deepseek", baseurl: "https://proxy.example/v1", apikey: "k" });
  assert.equal(p.base, "https://proxy.example/v1");
  assert.equal(p.usingCustomBase, true);
});
t("baseurl 与预设相同不算自定义", () => assert.equal(provider1({ preset: "deepseek", baseurl: "https://api.deepseek.com/" }).usingCustomBase, false));
t("未知预设回退 deepseek", () => assert.equal(provider1({ preset: "nope" }).presetName, "deepseek"));
t("StepFun 用标准端点 /v1", () => {
  const p = provider1({ preset: "stepfun", apikey: "k" });
  assert.equal(p.base, "https://api.stepfun.com/v1");
  assert.equal(p.model, "step-3.7-flash");
});

console.log("\nprovider2");
t("same 且无 model2 -> 空模型（触发提示）", () => assert.equal(provider2({ preset: "deepseek", apikey: "k" }).model, ""));
t("same + 同厂商 model2 沿用第一个 Key", () => {
  const p = provider2({ preset: "deepseek", model2: "deepseek-v4-pro", apikey: "k" });
  assert.equal(p.model, "deepseek-v4-pro");
  assert.equal(p.key, "k");
});
t("same + 别家 model2 被清空", () => assert.equal(provider2({ preset: "qwen", model2: "deepseek-flash", apikey: "k" }).model, ""));
t("同一预设名 + 自定义 Base URL 代理 -> 沿用代理地址与 Key", () => {
  const p = provider2({ preset: "deepseek", baseurl: "https://proxy.example/v1", preset2: "deepseek", model2: "deepseek-v4-pro", apikey: "k" });
  assert.equal(p.base, "https://proxy.example/v1");
  assert.equal(p.key, "k");
});
t("不同预设用其默认模型与地址", () => {
  const p = provider2({ preset: "deepseek", preset2: "qwen", apikey: "a" });
  assert.equal(p.model, PRESETS.qwen.model);
  assert.equal(p.base, PRESETS.qwen.baseurl);
  assert.equal(p.key, undefined); // 必须单独填第二个 Key
});
t("不同预设 apikey2 优先", () => assert.equal(provider2({ preset: "deepseek", preset2: "qwen", apikey: "a", apikey2: "b" }).key, "b"));

console.log("\nbuildPrompt");
t("包含目标语言", () => assert.match(buildPrompt("en", "general", "", 1), /into English/));
t("自由语言名进提示词", () => assert.match(buildPrompt("Cantonese", "general", "", 1), /into Cantonese/));
t("防注入声明", () => assert.match(buildPrompt("en", "general", "", 1), /never instructions to you/));
t("中文目标带反翻译腔", () => assert.match(buildPrompt("zh", "general", "", 1), /避免翻译腔/));
t("多备选编号", () => assert.match(buildPrompt("en", "general", "", 3), /Provide 3 distinct/));
t("术语表追加", () => assert.match(buildPrompt("en", "general", "Xray 不翻译", 1), /Xray 不翻译/));
t("auto 含检测规则", () => assert.match(buildPrompt("auto", "general", "", 1), /Detect the language/));

console.log("\nbuildLearningPrompt / NAMING_PROMPT");
t("目标英文用英文导师提示", () => assert.match(buildLearningPrompt("en"), /English tutor/));
t("目标中文用中文提示", () => assert.match(buildLearningPrompt("zh"), /语言老师/));
t("NAMING_PROMPT 要求小写英文词", () => assert.match(NAMING_PROMPT, /lowercase English words/));
t("NAMING_PROMPT 防注入", () => assert.match(NAMING_PROMPT, /never instructions to you/));

console.log("\nConfig.js 静态检查");
t("使用正确拼写 restorePasteboard", () => {
  assert.match(configSrc, /restorePasteboard/);
  assert.doesNotMatch(configSrc, /restorePasteBoard/);
});
t("无未使用的 HAN 常量", () => assert.doesNotMatch(configSrc, /\bHAN\b/));
t("声明 script 权限", () => assert.match(configSrc, /entitlements:\s*\[network,\s*script\]/));
t("引入 lib.js", () => assert.match(configSrc, /from\s+"\.\/lib\.js"/));

console.log("\n杂项");
t("HAS_LETTER 对纯符号为 false", () => assert.equal(HAS_LETTER.test("123 !!! ——"), false));
t("HAS_LETTER 对文字为 true", () => assert.equal(HAS_LETTER.test("你好"), true));
t("TARGETS 含主要语言", () => ["zh", "en", "ja", "ko", "ru"].forEach(k => assert.ok(TARGETS[k])));

console.log("\n========================");
console.log("通过 " + pass + " / 失败 " + fail);
console.log("========================");
process.exit(fail ? 1 : 0);
