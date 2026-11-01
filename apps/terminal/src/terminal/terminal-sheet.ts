export const TERMINAL_SHEET = `
.wg-terminal { position: relative; display: flex; flex-direction: column; gap: 8px; height: 100%; box-sizing: border-box; padding: 12px 16px; background: var(--sumi-plate); overflow: hidden; }
.wg-terminal-screen { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.wg-terminal-line { position: relative; z-index: 1; flex: none; display: flex; flex-direction: column; gap: 4px; }
.wg-terminal-line-input { box-sizing: border-box; width: 100%; padding: 8px 0; border: 0; outline: none; background: transparent; color: var(--sumi-text); font-family: var(--sumi-font-mono); font-size: 13px; }
.wg-terminal-line .wg-terminal-note { padding: 0; }
.xterm { cursor: text; position: relative; user-select: none; -webkit-user-select: none; height: 100%; }
.xterm.focus, .xterm:focus { outline: none; }
.xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
.xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
.xterm .composition-view { background: var(--sumi-plate); color: var(--sumi-text); display: none; position: absolute; white-space: nowrap; z-index: 1; }
.xterm .composition-view.active { display: block; }
.xterm .xterm-viewport { background-color: transparent; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
.xterm .xterm-screen { position: relative; }
.xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
.xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
.xterm.enable-mouse-events { cursor: default; }
.xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
.xterm .xterm-accessibility:not(.debug), .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; pointer-events: none; }
.xterm .xterm-accessibility-tree:not(.debug) *::selection { color: transparent; }
.xterm .xterm-accessibility-tree { font-family: monospace; user-select: text; white-space: pre; }
.xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.xterm-dim { opacity: 1 !important; }
.xterm-underline-1 { text-decoration: underline; }
.xterm-underline-2 { text-decoration: double underline; }
.xterm-underline-3 { text-decoration: wavy underline; }
.xterm-underline-4 { text-decoration: dotted underline; }
.xterm-underline-5 { text-decoration: dashed underline; }
.xterm-overline { text-decoration: overline; }
.xterm-strikethrough { text-decoration: line-through; }
.xterm-screen .xterm-decoration-container .xterm-decoration { z-index: 6; position: absolute; }
.xterm-decoration-overview-ruler { z-index: 8; position: absolute; top: 0; right: 0; pointer-events: none; }
.xterm .xterm-scrollable-element > .scrollbar { cursor: default; }
.xterm .xterm-scrollable-element > .scrollbar > .slider { background: var(--sumi-active); border-radius: 4px; }
.xterm .xterm-scrollable-element > .visible { opacity: 1; transition: opacity 100ms linear; z-index: 11; }
.xterm .xterm-scrollable-element > .invisible { opacity: 0; pointer-events: none; }
.xterm .xterm-scrollable-element > .invisible.fade { transition: opacity 800ms linear; }
.xterm .xterm-scrollable-element > .shadow { display: none; }
`;
