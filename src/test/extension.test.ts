import * as assert from "assert";
import * as vscode from "vscode";

suite("Center Editor Window extension", () => {
  test("activates successfully", async () => {
    const extension = vscode.extensions.getExtension("kaiwood.center-editor-window");

    assert.ok(extension);
    if (!extension) {
      return;
    }

    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test("registers the center command", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("center-editor-window.center"));
  });

  test("runs the center command with an active editor", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: ["first", "second", "third"].join("\n"),
      language: "plaintext"
    });

    await vscode.window.showTextDocument(document);

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand("center-editor-window.center");
    });
  });

  test("does not throw without an active editor", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand("center-editor-window.center");
    });
  });

  test("exposes typed configuration defaults", () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");

    assert.strictEqual(config.get<boolean>("threeStateToggle"), false);
    assert.strictEqual(config.get<number>("offset"), 0);
  });
});
