# Release Notes

## 3.1.0

- Ignore mouse selection changes while Typewriter Scroll Mode is enabled.
- Add `center-editor-window.typewriterScrollModePosition` to keep the current line near the top, center, or bottom.
- Add `center-editor-window.typewriterScrollModeSmooth` to avoid recentering until the current line moves away from the configured viewport position.

## 3.0.0

- Modernize the extension build, test, and packaging tooling.
- Bundle the extension runtime with esbuild.
- Add VS Code extension integration tests.
- Raise the minimum VS Code version to 1.74.
- Add an opt-in typewriter scroll mode that keeps the current line centered whenever the cursor changes lines.
- Add an opt-in setting to center the current line after undo or redo.
- Center horizontally on long unwrapped lines.

## 2.3.0

Cancel timeout for the 3-state toggle when the active editor changes

## 2.1.0

Additional setting `center-editor-window.threeStateToggle: true/false` to enable toggling between centering the current line center, moving it to the top of the viewport and moving it to the bottom.

## 2.0.2

Use looping gif for description

## 2.0.1

Polishing release adding more metadata and images.

Additionally, some namespaces have changed, so we need to bump the major version because it might break custom set shortcuts.

## 1.0.0

Initial Release
