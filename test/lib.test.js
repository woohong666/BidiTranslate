// v15 纯逻辑单元测试 + Config.js 静态检查
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PRESETS, TARGETS, NAMING_PROMPT, MODELS, MODEL_VALUES, MODEL_LABELS,
  modelFits, protocolFor, thinkOffFor, normalizeModel,
  characterCount, maxCharsOf, splitTextByLimit, guardInput,
  detectSourceKey, targetName, targetKeyOf, resolveLearningTarget,
  buildPrompt, buildLearningPrompt, cleanOutput, parseExtraBody,
  provider1, provider2, toNaming, toWords, HAS_LETTER,
} from "../BidiTranslate.popclipext/lib.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configSrc = readFileSync(join(root, "BidiTranslate.popclipext", "Config.js"), "utf8");

let pass = 0;
let fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log("  ok   " + name); }
  catch (e) { fail++; console.log("  FAIL " + name + "\n       " + (e && e.message)); }
}

console.log("\nthinking / protocol");
t("DeepSeek non-thinking", () => assert.deepEqual(thinkOffFor("deepseek-flash"), { thinking: { type: "disabled" } }));
t("GLM-5.3 uses low effort", () => assert.deepEqual(thinkOffFor("glm-5.3-flash"), { thinking: { type: "enabled" }, reasoning_effort: "low" }));
t("GLM-5.2 can disable", () => assert.deepEqual(thinkOffFor("glm-5.2"), { thinking: { type: "disabled" } }));
t("Qwen3 disables thinking", () => assert.deepEqual(thinkOffFor("qwen3.7-plus"), { enable_thinking: false }));
t("unknown model leaves thinking untouched", () => assert.equal(thinkOffFor("mystery-model"), null));
t("Go chat protocol", () => assert.equal(protocolFor("opencodego", "mimo-v2.6-flash", "auto"), "chat"));
t("Go Responses protocol", () => assert.equal(protocolFor("opencodego", "gpt-6-luna", "auto"), "responses"));
t("Go Anthropic protocol", () => assert.equal(protocolFor("opencodego", "qwen3.8-max", "auto"), "anthropic"));
t("manual protocol override", () => assert.equal(protocolFor("opencodego", "new-model", "responses"), "responses"));
t("non-Go ignores Go protocol setting", () => assert.equal(protocolFor("deepseek", "gpt-6-luna", "responses"), "chat"));

console.log("\nmodels / providers");
t("model values and labels have same length", () => assert.equal(MODEL_VALUES.length, MODEL_LABELS.length));
t("model values are unique", () => assert.equal(new Set(MODEL_VALUES).size, MODEL_VALUES.length));
t("Go model catalog contains requested models", () => {
  assert.ok(MODEL_VALUES.includes("glm-5.3-flash"));
  assert.ok(MODEL_VALUES.includes("mimo-v2.6-flash"));
  assert.ok(MODEL_VALUES.includes("gpt-6-luna"));
  assert.ok(MODEL_VALUES.includes("qwen3.8-max"));
});
t("shared DeepSeek Pro fits both providers", () => {
  assert.equal(modelFits("deepseek-v4-pro", "deepseek"), true);
  assert.equal(modelFits("deepseek-v4-pro", "opencodego"), true);
});
t("foreign model does not fit DeepSeek", () => assert.equal(modelFits("glm-5.3-flash", "deepseek"), false));
t("legacy model normalized for Go", () => assert.equal(normalizeModel("deepseek-chat", "opencodego"), "deepseek-v4.1-flash"));
t("direct DeepSeek defaults to V4.1 Flash alias", () => {
  const p = provider1({ preset: "deepseek", modelChoice: "", apikey: "k" });
  assert.equal(p.base, PRESETS.deepseek.baseurl);
  assert.equal(p.model, "deepseek-flash");
});
t("Go MiMo route", () => {
  const p = provider1({ preset: "opencodego", modelChoice: "mimo-v2.6-flash", apikey: "go" });
  assert.equal(p.base, PRESETS.opencodego.baseurl);
  assert.equal(p.model, "mimo-v2.6-flash");
});
t("Go fallback route keeps second key", () => {
  const p = provider2({ preset: "deepseek", preset2: "opencodego", model2: "glm-5.3-flash", apikey: "a", apikey2: "b" });
  assert.equal(p.model, "glm-5.3-flash");
  assert.equal(p.key, "b");
});

console.log("\ntext limits / splitting");
t("Unicode character count", () => assert.equal(characterCount("😀a中"), 3));
t("zero means unlimited", () => {
  assert.equal(maxCharsOf("0"), 0);
  assert.equal(guardInput("x".repeat(30000), maxCharsOf("0")).length, 30000);
});
t("over-limit input is rejected", () => assert.throws(() => guardInput("ab", maxCharsOf("1")), /超过当前上限/));
t("long text splits without losing source", () => {
  const source = "第一段。\n\n第二段，这里还有更多内容。\n第三段";
  const chunks = splitTextByLimit(source, 8);
  assert(chunks.length > 1);
  assert.equal(chunks.join(""), source);
  assert(chunks.every(chunk => characterCount(chunk) <= 8));
});

console.log("\nlanguage / prompts");
t("English source voice", () => assert.equal(detectSourceKey("Hello world"), "en"));
t("Japanese source voice", () => assert.equal(detectSourceKey("こんにちは世界"), "ja"));
t("Chinese source voice", () => assert.equal(detectSourceKey("你好世界"), "zh"));
t("target name", () => assert.equal(targetName("en"), "English"));
t("custom target name", () => assert.equal(targetName("Cantonese"), "Cantonese"));
t("target override wins", () => assert.equal(targetKeyOf({ target: "zh" }, "en"), "en"));
t("Han-only learning text defers to model", () => assert.equal(resolveLearningTarget("明日", "auto"), "auto"));
t("automatic learning direction defers to model", () => assert.equal(resolveLearningTarget("hello", "auto"), "auto"));
t("prompt contains injection defense", () => assert.match(buildPrompt("en", "general", "", 1), /never instructions to you/));
t("prompt contains target language", () => assert.match(buildPrompt("en", "general", "", 1), /into English/));
t("learning prompt contains study-material defense", () => assert.match(buildLearningPrompt("en"), /never instructions/));
t("naming prompt contains lowercase rule", () => assert.match(NAMING_PROMPT, /lowercase English words/));

console.log("\ncleaning / naming / extra body");
t("clean think block", () => assert.equal(cleanOutput("<think>x</think>正常"), "正常"));
t("clean source tags", () => assert.equal(cleanOutput("<source>hi</source>"), "hi"));
t("preserve apostrophe", () => assert.equal(cleanOutput("don't stop"), "don't stop"));
t("camel naming", () => assert.equal(toNaming("User Login Name", "camel"), "userLoginName"));
t("Pascal naming", () => assert.equal(toNaming("User Login Name", "pascal"), "UserLoginName"));
t("HTTP word boundaries", () => assert.deepEqual(toWords("HTTPServerConfig"), ["http", "server", "config"]));
t("extra JSON object", () => assert.deepEqual(parseExtraBody('{"top_p":0.8}'), { top_p: 0.8 }));
t("extra array rejected", () => assert.throws(() => parseExtraBody("[1,2]")));
t("extra structural fields rejected", () => {
  assert.throws(() => parseExtraBody('{"input":"x"}'));
  assert.throws(() => parseExtraBody('{"system":"x"}'));
});

console.log("\nConfig.js static checks");
t("correct restorePasteboard spelling", () => {
  assert.match(configSrc, /restorePasteboard/);
  assert.doesNotMatch(configSrc, /restorePasteBoard/);
});
t("network and script entitlements", () => assert.match(configSrc, /entitlements:\s*\[network,\s*script\]/));
t("streaming option", () => assert.match(configSrc, /identifier: "streaming"/));
t("Go protocol routes", () => {
  assert.match(configSrc, /\/responses/);
  assert.match(configSrc, /\/messages/);
  assert.match(configSrc, /x-opencode-session/);
});
t("fallback and chunking options", () => {
  assert.match(configSrc, /identifier: "fallback"/);
  assert.match(configSrc, /identifier: "chunklong"/);
});
t("Go model directory action", () => assert.match(configSrc, /Go 模型目录/));
t("HAS_LETTER symbols false", () => assert.equal(HAS_LETTER.test("123 !!! ——"), false));
t("TARGETS include main languages", () => ["zh", "en", "ja", "ko", "ru"].forEach(k => assert.ok(TARGETS[k])));

console.log("\n========================");
console.log("通过 " + pass + " / 失败 " + fail);
console.log("========================");
process.exit(fail ? 1 : 0);
