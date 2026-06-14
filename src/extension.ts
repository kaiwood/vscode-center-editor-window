import * as vscode from "vscode";

type ViewportPosition = "center" | "top" | "bottom";
type ToggleState = ViewportPosition;

const typewriterLineByEditor = new WeakMap<vscode.TextEditor, number>();
const HORIZONTAL_CENTER_PADDING_COLUMNS = 120;
const TYPEWRITER_SMOOTH_SCROLL_TOLERANCE_RATIO = 0.15;
const TYPEWRITER_SMOOTH_SCROLL_MIN_TOLERANCE_LINES = 2;

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
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      state = "center";
      rememberTypewriterLine(editor);
    })
  );

  rememberTypewriterLine(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(maybeCenterTypewriterSelection)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(maybeCenterUndoRedoChange)
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

function maybeCenterUndoRedoChange(event: vscode.TextDocumentChangeEvent): void {
  const editor = vscode.window.activeTextEditor;

  if (
    !editor ||
    event.document !== editor.document ||
    (event.reason !== vscode.TextDocumentChangeReason.Undo &&
      event.reason !== vscode.TextDocumentChangeReason.Redo) ||
    !vscode.workspace
      .getConfiguration("center-editor-window")
      .get("centerOnUndoRedo")
  ) {
    return;
  }

  void revealLineInEditor(
    editor,
    editor.selection.active.line,
    editor.selection.active.character,
    "center"
  );
}

function maybeCenterTypewriterSelection(
  event: vscode.TextEditorSelectionChangeEvent
): void {
  const activeLine = event.selections[0]?.active.line;

  if (
    event.textEditor !== vscode.window.activeTextEditor ||
    activeLine === undefined ||
    event.kind === vscode.TextEditorSelectionChangeKind.Mouse ||
    typewriterLineByEditor.get(event.textEditor) === activeLine ||
    !vscode.workspace
      .getConfiguration("center-editor-window")
      .get("typewriterScrollMode")
  ) {
    rememberTypewriterLine(event.textEditor);
    return;
  }

  const position = getTypewriterScrollModePosition();

  typewriterLineByEditor.set(event.textEditor, activeLine);
  if (
    getTypewriterScrollModeSmooth() &&
    isLineNearTypewriterPosition(event.textEditor, activeLine, position)
  ) {
    return;
  }

  void revealLineInEditor(
    event.textEditor,
    activeLine,
    event.selections[0].active.character,
    position
  );
}

async function toCenter() {
  const currentPosition = getCurrentPosition();
  if (!currentPosition) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  await revealLineInEditor(
    editor,
    currentPosition.line,
    currentPosition.character,
    "center"
  );
}

async function revealLineInEditor(
  editor: vscode.TextEditor,
  line: number,
  character: number,
  position: ViewportPosition
): Promise<void> {
  switch (position) {
    case "center":
      revealRangeInEditor(editor, line + getOffset(), character, position);
      break;
    case "top":
      revealRangeInEditor(editor, line - getOffset(), character, position);
      break;
    case "bottom":
      await revealLineAtBottom(editor, line + getOffset(), character);
      break;
  }
}

function revealRangeInEditor(
  editor: vscode.TextEditor,
  line: number,
  character: number,
  position: Exclude<ViewportPosition, "bottom">
): void {
  const targetLine = clampLine(line, editor.document.lineCount);
  const targetLineLength = editor.document.lineAt(targetLine).text.length;
  const targetCharacter = clampCharacter(character, targetLineLength);
  const targetRange = createCenteredCharacterRange(targetLine, targetCharacter);
  const revealType =
    position === "top"
      ? vscode.TextEditorRevealType.AtTop
      : vscode.TextEditorRevealType.InCenter;

  editor.revealRange(targetRange, revealType);
}

async function revealLineAtBottom(
  editor: vscode.TextEditor,
  line: number,
  character: number
): Promise<void> {
  const targetLine = clampLine(line, editor.document.lineCount);
  const targetLineLength = editor.document.lineAt(targetLine).text.length;
  const targetCharacter = clampCharacter(character, targetLineLength);
  const targetRange = createCenteredCharacterRange(targetLine, targetCharacter);

  await vscode.commands.executeCommand("revealLine", {
    lineNumber: targetLine,
    at: "bottom"
  });
  editor.revealRange(targetRange, vscode.TextEditorRevealType.Default);
}

function getOffset(): number {
  return vscode.workspace
    .getConfiguration("center-editor-window")
    .get<number>("offset", 0);
}

function getTypewriterScrollModePosition(): ViewportPosition {
  return vscode.workspace
    .getConfiguration("center-editor-window")
    .get<ViewportPosition>("typewriterScrollModePosition", "center");
}

function getTypewriterScrollModeSmooth(): boolean {
  return vscode.workspace
    .getConfiguration("center-editor-window")
    .get<boolean>("typewriterScrollModeSmooth", false);
}

function isLineNearTypewriterPosition(
  editor: vscode.TextEditor,
  line: number,
  position: ViewportPosition
): boolean {
  const range = editor.visibleRanges[0];
  if (!range) {
    return false;
  }

  const targetLine = getTypewriterTargetLine(editor, line, position);
  const viewportLine = getViewportLineForPosition(range, position);

  return Math.abs(targetLine - viewportLine) <= getSmoothScrollTolerance(range);
}

function getTypewriterTargetLine(
  editor: vscode.TextEditor,
  line: number,
  position: ViewportPosition
): number {
  switch (position) {
    case "center":
      return clampLine(line + getOffset(), editor.document.lineCount);
    case "top":
      return clampLine(line - getOffset(), editor.document.lineCount);
    case "bottom":
      return clampLine(line + getOffset(), editor.document.lineCount);
  }
}

function getViewportLineForPosition(
  range: vscode.Range,
  position: ViewportPosition
): number {
  switch (position) {
    case "center":
      return range.start.line + getViewportLineCount(range) / 2;
    case "top":
      return range.start.line;
    case "bottom":
      return range.end.line;
  }
}

function getSmoothScrollTolerance(range: vscode.Range): number {
  return Math.max(
    TYPEWRITER_SMOOTH_SCROLL_MIN_TOLERANCE_LINES,
    Math.ceil(getViewportLineCount(range) * TYPEWRITER_SMOOTH_SCROLL_TOLERANCE_RATIO)
  );
}

function getViewportLineCount(range: vscode.Range): number {
  return range.end.line - range.start.line;
}

function rememberTypewriterLine(editor: vscode.TextEditor | undefined): void {
  if (!editor) {
    return;
  }

  typewriterLineByEditor.set(editor, editor.selection.active.line);
}

function clampLine(line: number, lineCount: number): number {
  return Math.max(0, Math.min(line, lineCount - 1));
}

function clampCharacter(character: number, lineLength: number): number {
  return Math.max(0, Math.min(character, lineLength));
}

function createCenteredCharacterRange(
  line: number,
  character: number
): vscode.Range {
  return new vscode.Range(
    line,
    Math.max(0, character - HORIZONTAL_CENTER_PADDING_COLUMNS),
    line,
    character + HORIZONTAL_CENTER_PADDING_COLUMNS
  );
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

function getCurrentPosition(): vscode.Position | undefined {
  return vscode.window.activeTextEditor?.selection.active;
}

export function deactivate() {}
