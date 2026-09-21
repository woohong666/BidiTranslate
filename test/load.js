// 用 PopClip 自带的 JS 测试环境加载扩展，校验语法与模块解析：node test/load.js
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "BidiTranslate.popclipext");
const bin = "/Applications/PopClip.app/Contents/MacOS/PopClip";

try {
  const out = execFileSync(bin, ["run", "Config.js"], { cwd: pkg, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log(out.trim());
  console.log("\n扩展加载成功 ✅  (" + pkg + ")");
} catch (e) {
  console.error("扩展加载失败 ❌");
  console.error((e.stdout || "").trim());
  console.error((e.stderr || "").trim());
  console.error(e.message);
  process.exit(1);
}
