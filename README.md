# Center Editor Window

This extension centers your editor window at the current cursor position. Default shortcut is `Ctrl+L`.

![Centering the window](images/vscode-center-editor-window.gif)

## Settings

- `center-editor-window.threeStateToggle`: toggle between centering the current line, moving it to the top of the viewport, and moving it to the bottom.
- `center-editor-window.offset`: offset from the center target when centering.

## Development

- `npm run compile`: type-check and build the extension bundle.
- `npm test`: run the VS Code extension tests.
- `npm run package`: build the production extension bundle.
- `npm run vsce:package`: create a VSIX package.
