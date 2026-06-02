/**
 * goRunner.js
 * Spawns the compiled ChainForge Go binary and captures its stdout/stderr.
 * The Go binary must be built with:  go build -o chainforge.exe  (or chainforge on Linux/macOS)
 */

const { execFile } = require("child_process");
const path = require("path");
const os = require("os");

const ROOT = path.join(__dirname, ".."); // project root where the Go binary lives
const BINARY =
  os.platform() === "win32"
    ? path.join(ROOT, "chainforge.exe")
    : path.join(ROOT, "chainforge");

const NODE_ID = process.env.NODE_ID || "3000";

/**
 * run(args) → Promise<{ stdout, stderr }>
 * Example: run(["getbalance", "-address", "1AbC..."])
 */
function run(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, NODE_ID };
    execFile(BINARY, args, { cwd: ROOT, env, timeout: 15000 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        return reject(new Error(stderr || err.message));
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

module.exports = { run, NODE_ID };
