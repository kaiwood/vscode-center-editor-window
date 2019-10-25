"use strict";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let state = "center";
  let timeout;

  function reset() {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      state = "center";
    }, 1000);
  }

  vscode.window.onDidChangeActiveTextEditor(() => {
    clearTimeout(timeout);
    state = "center";
  });

  let disposable = vscode.commands.registerCommand(
    "center-editor-window.center",
    () => {
      if (
        vscode.workspace
          .getConfiguration("center-editor-window")
          .get("threeStateToggle")
      ) {
        switch (state) {
          case "center":
            toCenter();
            state = "top";
            reset();
            break;
          case "top":
            toTop();
            state = "bottom";
            reset();
            break;
          case "bottom":
            toBottom();
            state = "center";
            reset();
            break;
        }
      } else {
        toCenter();
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function toCenter() {
  let currentLineNumber = vscode.window.activeTextEditor.selection.start.line;
  let offset = +vscode.workspace
    .getConfiguration("center-editor-window")
    .get("offset");
  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber + offset,
    at: "center"
  });
}

async function toTop() {
  let currentLineNumber = vscode.window.activeTextEditor.selection.start.line;
  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber,
    at: "top"
  });
}

async function toBottom() {
  let currentLineNumber = vscode.window.activeTextEditor.selection.start.line;
  await vscode.commands.executeCommand("revealLine", {
    lineNumber: currentLineNumber,
    at: "bottom"
  });
}

export function deactivate() {}
