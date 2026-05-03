import * as vscode from "vscode";

type ToggleState = "center" | "top" | "bottom";

const typewriterLineByEditor = new WeakMap<vscode.TextEditor, number>();
const HORIZONTAL_CENTER_PADDING_COLUMNS = 120;

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

function maybeCenterTypewriterSelection(
  event: vscode.TextEditorSelectionChangeEvent
): void {
  const activeLine = event.selections[0]?.active.line;

  if (
    event.textEditor !== vscode.window.activeTextEditor ||
    activeLine === undefined ||
    typewriterLineByEditor.get(event.textEditor) === activeLine ||
    !vscode.workspace
      .getConfiguration("center-editor-window")
      .get("typewriterScrollMode")
  ) {
    rememberTypewriterLine(event.textEditor);
    return;
  }

  typewriterLineByEditor.set(event.textEditor, activeLine);
  centerLineInEditor(
    event.textEditor,
    activeLine,
    event.selections[0].active.character
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

  centerLineInEditor(editor, currentPosition.line, currentPosition.character);
}

function centerLineInEditor(
  editor: vscode.TextEditor,
  line: number,
  character: number
): void {
  const offset = vscode.workspace
    .getConfiguration("center-editor-window")
    .get<number>("offset", 0);
  const targetLine = clampLine(line + offset, editor.document.lineCount);
  const targetLineLength = editor.document.lineAt(targetLine).text.length;
  const targetCharacter = clampCharacter(character, targetLineLength);
  const targetRange = createCenteredCharacterRange(targetLine, targetCharacter);

  editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
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
