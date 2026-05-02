import * as vscode from "vscode";

type ToggleState = "center" | "top" | "bottom";

export function activate(context: vscode.ExtensionContext) {
  let state: ToggleState = "center";
  let timeout: NodeJS.Timeout | undefined;

  function reset() {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      state = "center";
    }, 1000);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
      state = "center";
    })
  );

  const disposable = vscode.commands.registerCommand(
    "center-editor-window.center",
    async () => {
      if (
        vscode.workspace
          .getConfiguration("center-editor-window")
          .get("threeStateToggle")
      ) {
        switch (state) {
          case "center":
            await toCenter();
            state = "top";
            reset();
            break;
          case "top":
            await toTop();
            state = "bottom";
            reset();
            break;
          case "bottom":
            await toBottom();
            state = "center";
            reset();
            break;
        }
      } else {
        await toCenter();
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function toCenter() {
  const currentLineNumber = getCurrentLineNumber();
  if (currentLineNumber === undefined) {
    return;
  }

  const offset = vscode.workspace
    .getConfiguration("center-editor-window")
    .get<number>("offset", 0);
  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber + offset,
    at: "center"
  });
}

async function toTop() {
  const currentLineNumber = getCurrentLineNumber();
  if (currentLineNumber === undefined) {
    return;
  }

  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber,
    at: "top"
  });
}

async function toBottom() {
  const currentLineNumber = getCurrentLineNumber();
  if (currentLineNumber === undefined) {
    return;
  }

  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber,
    at: "bottom"
  });
}

function getCurrentLineNumber(): number | undefined {
  return vscode.window.activeTextEditor?.selection.start.line;
}

export function deactivate() {}
