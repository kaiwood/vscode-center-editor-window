import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const COMMAND = "center-editor-window.center";
const LINE_COUNT = 300;
const CURSOR_LINE = 240;
const LONG_LINE_CHARACTER = 800;

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

    assert.ok(commands.includes(COMMAND));
  });

  test("activates after startup so background settings can listen to editor events", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8")
    ) as { activationEvents?: string[] };

    assert.ok(packageJson.activationEvents?.includes("onStartupFinished"));
  });

  test("centers the current line in the viewport", async () => {
    const editor = await openLongDocumentAtLine(CURSOR_LINE);

    await vscode.commands.executeCommand(COMMAND);
    await waitForVisibleRange(editor, (range) =>
      isLineNearViewportCenter(range, CURSOR_LINE)
    );

    assertLineNearViewportCenter(editor, CURSOR_LINE);
  });

  test("centers the current character horizontally on long unwrapped lines", async () => {
    const config = vscode.workspace.getConfiguration("editor");
    const previousWordWrap = config.get<string>("wordWrap");
    const editor = await openLongDocumentAtPosition(
      new vscode.Position(CURSOR_LINE, LONG_LINE_CHARACTER),
      (index) =>
        index === CURSOR_LINE
          ? "x".repeat(LONG_LINE_CHARACTER * 2)
          : `Line ${index + 1}`
    );

    try {
      await config.update("wordWrap", "off", vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand(COMMAND);
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE)
      );

      assert.strictEqual(editor.selection.active.line, CURSOR_LINE);
      assert.strictEqual(editor.selection.active.character, LONG_LINE_CHARACTER);

      await assertCharacterAtWrappedLineColumnCenter(
        editor,
        CURSOR_LINE,
        LONG_LINE_CHARACTER
      );
    } finally {
      await config.update(
        "wordWrap",
        previousWordWrap,
        vscode.ConfigurationTarget.Global
      );
    }
  });

  test("moves the current line through center, top, and bottom when three-state toggle is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousThreeStateToggle = config.get<boolean>("threeStateToggle");
    const previousOffset = config.get<number>("offset");
    const editor = await openLongDocumentAtLine(CURSOR_LINE);

    try {
      await config.update("threeStateToggle", true, vscode.ConfigurationTarget.Global);
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand(COMMAND);
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE)
      );
      assertLineNearViewportCenter(editor, CURSOR_LINE);

      await vscode.commands.executeCommand(COMMAND);
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportTop(range, CURSOR_LINE)
      );
      assertLineNearViewportTop(editor, CURSOR_LINE);

      await vscode.commands.executeCommand(COMMAND);
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportBottom(range, CURSOR_LINE)
      );
      assertLineNearViewportBottom(editor, CURSOR_LINE);
    } finally {
      await config.update(
        "threeStateToggle",
        previousThreeStateToggle,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("does not typewriter-center cursor line changes when typewriter scroll mode is disabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const previousOffset = config.get<number>("offset");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "typewriterScrollMode",
        false,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand("cursorDown");
      await sleep(250);

      assertLineNotNearViewportCenter(editor, CURSOR_LINE + 1);
    } finally {
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("keeps downward cursor line changes centered when typewriter scroll mode is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const previousOffset = config.get<number>("offset");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "typewriterScrollMode",
        true,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand("cursorDown");
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE + 1)
      );

      assertLineNearViewportCenter(editor, CURSOR_LINE + 1);
    } finally {
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("keeps upward cursor line changes centered when typewriter scroll mode is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const previousOffset = config.get<number>("offset");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "typewriterScrollMode",
        true,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand("cursorUp");
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE - 1)
      );

      assertLineNearViewportCenter(editor, CURSOR_LINE - 1);
    } finally {
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("keeps backspace line deletion centered when typewriter scroll mode is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const previousOffset = config.get<number>("offset");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "typewriterScrollMode",
        true,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await vscode.commands.executeCommand("deleteLeft");
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE - 1)
      );

      assertLineNearViewportCenter(editor, CURSOR_LINE - 1);
    } finally {
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("does not center undo changes when center on undo/redo is disabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousCenterOnUndoRedo = config.get<boolean>("centerOnUndoRedo");
    const previousOffset = config.get<number>("offset");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "centerOnUndoRedo",
        false,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        false,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await insertTextAtCursor(editor, "changed ");
      revealLineAtTop(editor, CURSOR_LINE - 4);
      await vscode.commands.executeCommand("undo");
      await sleep(250);

      assertLineNotNearViewportCenter(editor, CURSOR_LINE);
    } finally {
      await config.update(
        "centerOnUndoRedo",
        previousCenterOnUndoRedo,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("centers undo changes when center on undo/redo is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousCenterOnUndoRedo = config.get<boolean>("centerOnUndoRedo");
    const previousOffset = config.get<number>("offset");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "centerOnUndoRedo",
        true,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        false,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await insertTextAtCursor(editor, "changed ");
      revealLineAtTop(editor, CURSOR_LINE - 4);
      await vscode.commands.executeCommand("undo");
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE)
      );

      assertLineNearViewportCenter(editor, CURSOR_LINE);
    } finally {
      await config.update(
        "centerOnUndoRedo",
        previousCenterOnUndoRedo,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("centers redo changes when center on undo/redo is enabled", async () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");
    const previousCenterOnUndoRedo = config.get<boolean>("centerOnUndoRedo");
    const previousOffset = config.get<number>("offset");
    const previousTypewriterScrollMode = config.get<boolean>("typewriterScrollMode");
    const editor = await openLongDocumentAtLine(CURSOR_LINE, CURSOR_LINE - 4);

    try {
      await config.update(
        "centerOnUndoRedo",
        true,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        false,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", 0, vscode.ConfigurationTarget.Global);

      await insertTextAtCursor(editor, "changed ");
      await vscode.commands.executeCommand("undo");
      revealLineAtTop(editor, CURSOR_LINE - 4);
      await vscode.commands.executeCommand("redo");
      await waitForVisibleRange(editor, (range) =>
        isLineNearViewportCenter(range, CURSOR_LINE)
      );

      assertLineNearViewportCenter(editor, CURSOR_LINE);
    } finally {
      await config.update(
        "centerOnUndoRedo",
        previousCenterOnUndoRedo,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "typewriterScrollMode",
        previousTypewriterScrollMode,
        vscode.ConfigurationTarget.Global
      );
      await config.update("offset", previousOffset, vscode.ConfigurationTarget.Global);
    }
  });

  test("does not throw without an active editor", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand(COMMAND);
    });
  });

  test("exposes typed configuration defaults", () => {
    const config = vscode.workspace.getConfiguration("center-editor-window");

    assert.strictEqual(config.get<boolean>("threeStateToggle"), false);
    assert.strictEqual(config.get<number>("offset"), 0);
    assert.strictEqual(config.get<boolean>("typewriterScrollMode"), false);
    assert.strictEqual(config.get<boolean>("centerOnUndoRedo"), false);
  });
});

async function openLongDocumentAtLine(
  line: number,
  initialVisibleLine = 0
): Promise<vscode.TextEditor> {
  return openLongDocumentAtPosition(
    new vscode.Position(line, 0),
    undefined,
    initialVisibleLine
  );
}

async function openLongDocumentAtPosition(
  position: vscode.Position,
  lineFactory: ((index: number) => string) | undefined = undefined,
  initialVisibleLine = 0
): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument({
    content: Array.from(
      { length: LINE_COUNT },
      (_, index) => lineFactory?.(index) ?? `Line ${index + 1}`
    ).join("\n"),
    language: "plaintext"
  });

  const editor = await vscode.window.showTextDocument(document);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(
    new vscode.Range(initialVisibleLine, 0, initialVisibleLine, 0),
    vscode.TextEditorRevealType.AtTop
  );

  return editor;
}

async function insertTextAtCursor(
  editor: vscode.TextEditor,
  text: string
): Promise<void> {
  const didEdit = await editor.edit((edit) => {
    edit.insert(editor.selection.active, text);
  });

  assert.strictEqual(didEdit, true);
}

function revealLineAtTop(editor: vscode.TextEditor, line: number): void {
  editor.revealRange(
    new vscode.Range(line, 0, line, 0),
    vscode.TextEditorRevealType.AtTop
  );
}

async function waitForVisibleRange(
  editor: vscode.TextEditor,
  predicate: (range: vscode.Range) => boolean
): Promise<void> {
  const timeoutMs = 2000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const range = editor.visibleRanges[0];
    if (range && predicate(range)) {
      return;
    }

    await sleep(50);
  }
}

function assertLineNearViewportCenter(editor: vscode.TextEditor, line: number): void {
  const range = getVisibleRange(editor);

  assert.ok(
    isLineNearViewportCenter(range, line),
    `Expected line ${line} near viewport center, but visible range was ${formatRange(
      range
    )}.`
  );
}

function assertLineNotNearViewportCenter(editor: vscode.TextEditor, line: number): void {
  const range = getVisibleRange(editor);

  assert.ok(
    !isLineNearViewportCenter(range, line),
    `Expected line ${line} away from viewport center, but visible range was ${formatRange(
      range
    )}.`
  );
}

function assertLineNearViewportTop(editor: vscode.TextEditor, line: number): void {
  const range = getVisibleRange(editor);

  assert.ok(
    isLineNearViewportTop(range, line),
    `Expected line ${line} near viewport top, but visible range was ${formatRange(range)}.`
  );
}

function assertLineNearViewportBottom(editor: vscode.TextEditor, line: number): void {
  const range = getVisibleRange(editor);

  assert.ok(
    isLineNearViewportBottom(range, line),
    `Expected line ${line} near viewport bottom, but visible range was ${formatRange(
      range
    )}.`
  );
}

async function assertCharacterAtWrappedLineColumnCenter(
  editor: vscode.TextEditor,
  line: number,
  character: number
): Promise<void> {
  const originalSelections = editor.selections;

  try {
    await vscode.commands.executeCommand("cursorMove", {
      to: "wrappedLineColumnCenter"
    });

    const centerPosition = editor.selection.active;
    assert.strictEqual(
      centerPosition.line,
      line,
      `Expected wrapped-line center to stay on line ${line}, but it moved to ${centerPosition.line}.`
    );
    assert.ok(
      Math.abs(centerPosition.character - character) <= 1,
      `Expected character ${line}:${character} at wrapped-line center, but center was ${centerPosition.line}:${centerPosition.character}.`
    );
  } finally {
    editor.selections = originalSelections;
  }
}

function isLineNearViewportCenter(range: vscode.Range, line: number): boolean {
  const centerLine = range.start.line + viewportLineCount(range) / 2;

  return Math.abs(line - centerLine) <= tolerance(range);
}

function isLineNearViewportTop(range: vscode.Range, line: number): boolean {
  return line >= range.start.line && line - range.start.line <= tolerance(range);
}

function isLineNearViewportBottom(range: vscode.Range, line: number): boolean {
  return line <= range.end.line && range.end.line - line <= tolerance(range);
}

function getVisibleRange(editor: vscode.TextEditor): vscode.Range {
  const range = editor.visibleRanges[0];
  assert.ok(range, "Expected the editor to expose a visible range.");

  return range;
}

function viewportLineCount(range: vscode.Range): number {
  return range.end.line - range.start.line;
}

function tolerance(range: vscode.Range): number {
  return Math.max(2, Math.ceil(viewportLineCount(range) * 0.15));
}

function formatRange(range: vscode.Range): string {
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
