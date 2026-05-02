const { spawn } = require("child_process");

const commands = [
  ["npm", ["run", "watch:esbuild"]],
  ["npm", ["run", "watch:tsc"]]
];

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else if (code) {
      process.exit(code);
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
