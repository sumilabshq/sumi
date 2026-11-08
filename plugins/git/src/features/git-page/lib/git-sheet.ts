export const GIT_SHEET = `
.wg-git { display: flex; height: 100%; min-height: 0; box-sizing: border-box; background: var(--sumi-plate); color: var(--sumi-text); font: var(--sumi-fw-regular) var(--sumi-fs-13)/1.4 var(--sumi-font-ui); font-feature-settings: var(--sumi-font-features); }
.wg-git * { box-sizing: border-box; }
:where(.wg-git) :where(button, input) { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; text-align: left; }
:where(.wg-git) :where(button) { cursor: pointer; }
.wg-git-glyph { flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wg-git-page { position: relative; display: flex; flex: 1; min-width: 0; min-height: 0; padding-left: 6px; overflow: hidden; }
.wg-git-side { position: absolute; z-index: 2; top: 0; bottom: 6px; left: 6px; width: var(--wg-git-list-w, 256px); transition: transform var(--sumi-dur-slow) var(--sumi-ease-out), visibility 0s; display: flex; flex-direction: column; padding: 6px; border-radius: var(--sumi-r-md); background: var(--sumi-soft); min-height: 0; }
.wg-git-lists { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; margin: 0 -6px; padding: 0 6px; }
.wg-git-row { height: var(--sumi-h-row); width: 100%; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-radius: var(--sumi-r-md); white-space: nowrap; flex: none; transition: background var(--sumi-dur-hover) var(--sumi-ease); }
.wg-git-row:hover { background: var(--sumi-hover); }
.wg-git-row.is-act { background: var(--sumi-active); }
.wg-git-row.is-sel { background: var(--sumi-selected); font-weight: var(--sumi-fw-medium); }
.wg-git-row > .wg-git-glyph { color: var(--sumi-text-2); }
.wg-git-row .is-faint { color: var(--sumi-text-3); }
.wg-git-nm { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.wg-git-nm.is-fill { flex: 1; min-width: 0; }
.wg-git-row.is-seen .wg-git-nm { color: var(--sumi-text-2); font-weight: var(--sumi-fw-regular); }
.wg-git-dim { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--sumi-text-3); font-weight: var(--sumi-fw-regular); }
.wg-git-lbl { color: var(--sumi-text-3); }
.wg-git-hint { flex: none; display: inline-flex; align-items: center; gap: 6px; font-size: var(--sumi-fs-12); color: var(--sumi-text-3); font-weight: var(--sumi-fw-regular); }
.wg-git-nums { flex: none; font-size: var(--sumi-fs-11); font-variant-numeric: tabular-nums; font-weight: var(--sumi-fw-regular); }
.wg-git-add { color: var(--sumi-success); }
.wg-git-del { color: var(--sumi-danger); }
.wg-git-st { width: 16px; flex: none; text-align: center; font: var(--sumi-fw-medium) var(--sumi-fs-11)/1 var(--sumi-font-mono); color: var(--sumi-warning); }
.wg-git-st[data-status="added"] { color: var(--sumi-success); }
.wg-git-st[data-status="deleted"] { color: var(--sumi-danger); }
.wg-git-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sumi-warning); flex: none; }
.wg-git-sec { height: var(--sumi-h-row); flex: none; display: flex; align-items: center; gap: 6px; padding: 0 10px; margin-top: 16px; font-size: var(--sumi-fs-12); color: var(--sumi-text-2); }
.wg-git-sec b { font-weight: var(--sumi-fw-semi); color: var(--sumi-text); }
.wg-git-meta { display: flex; gap: 6px; padding: 2px 10px 8px 34px; font-size: var(--sumi-fs-12); color: var(--sumi-text-2); }
.wg-git-field { height: var(--sumi-h-md); flex: none; display: flex; align-items: center; gap: 8px; padding: 0 10px; margin: 2px 0 4px; border-radius: var(--sumi-r-md); background: var(--sumi-hover); color: var(--sumi-text-3); }
.wg-git-field input { flex: 1; min-width: 0; height: 100%; outline: none; color: var(--sumi-text); }
.wg-git-field input::placeholder { color: var(--sumi-text-3); }
.wg-git-pick { flex: none; }
.wg-git-pick > .wg-kit-anchor { display: block; }
.wg-kit-pop.wg-git-menu { width: 340px; }
.wg-git-mi-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.wg-git-mi-hint { flex: none; max-width: 45%; display: inline-flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--sumi-fs-12); color: var(--sumi-text-3); }
.wg-git-mlabel { padding: 8px 10px 4px; font-size: var(--sumi-fs-12); color: var(--sumi-text-3); }
.wg-git-diffs { --wg-git-diff-inset: var(--sumi-r-md); flex: 1; min-width: 0; min-height: 0; margin-left: calc(var(--wg-git-list-w, 256px) - var(--sumi-r-md)); padding-left: var(--wg-git-diff-inset); overflow-x: hidden; overflow-y: auto; }
.wg-git-page.is-list-hidden .wg-git-side { transform: translateX(calc(-100% - 12px)); visibility: hidden; transition: transform var(--sumi-dur-slow) var(--sumi-ease-out), visibility 0s linear var(--sumi-dur-slow); }
.wg-git-edge { position: absolute; z-index: 3; top: 0; bottom: 6px; left: calc(6px + var(--wg-git-list-w, 256px)); width: 8px; transform: translateX(-50%); cursor: col-resize; touch-action: none; outline: none; }
.wg-git-edge::after { content: ""; position: absolute; top: var(--sumi-r-md); bottom: var(--sumi-r-md); left: 3px; width: 2px; border-radius: 1px; background: transparent; transition: background var(--sumi-dur-fast) var(--sumi-ease); }
.wg-git-edge:is(:hover, :active, :focus-visible)::after { background: var(--sumi-line); }
.wg-git-page.is-list-hidden .wg-git-edge { display: none; }
.wg-git-page.is-list-hidden .wg-git-diffs { --wg-git-diff-inset: 0px; margin-left: -6px; }
.wg-git-file + .wg-git-file { border-top: 1px solid var(--sumi-line); }
.wg-git-fold { width: 24px; height: 24px; flex: none; display: inline-flex; align-items: center; justify-content: center; color: var(--sumi-text-2); }
.wg-git-fhead:focus-visible { outline: 2px solid var(--sumi-focus-ring); outline-offset: -2px; }
.wg-git-fpath { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.wg-git-fhead { position: sticky; top: 0; z-index: 1; height: 40px; display: flex; align-items: center; gap: 8px; margin-left: calc(-1 * var(--wg-git-diff-inset)); padding: 0 12px 0 calc(16px + var(--wg-git-diff-inset)); background: var(--sumi-plate); white-space: nowrap; cursor: pointer; user-select: none; transition: background var(--sumi-dur-hover) var(--sumi-ease); }
.wg-git-fhead:hover { background: linear-gradient(var(--sumi-hover), var(--sumi-hover)), var(--sumi-plate); }
.wg-git-dir { color: var(--sumi-text-3); }
.wg-git-base { font-weight: var(--sumi-fw-medium); }
.wg-git-gap { flex: 1; }
.wg-git-hidden { height: 28px; display: flex; align-items: center; gap: 8px; padding-left: 72px; font-size: var(--sumi-fs-12); color: var(--sumi-text-3); background: var(--sumi-sunken); }
.wg-git-ln { --wg-git-num-w: max(48px, calc(var(--wg-git-digits, 3) * 1ch + 20px)); display: grid; grid-template-columns: var(--wg-git-num-w) var(--wg-git-num-w) 22px minmax(0, 1fr); font: var(--sumi-fw-regular) 12.5px/20px var(--sumi-font-mono); }
.wg-git-ln[data-line="added"] { background: color-mix(in srgb, var(--sumi-success) 9%, transparent); }
.wg-git-ln[data-line="removed"] { background: color-mix(in srgb, var(--sumi-danger) 8%, transparent); }
.wg-git-n { padding-right: 10px; text-align: right; color: var(--sumi-text-3); font-variant-numeric: tabular-nums; user-select: none; }
.wg-git-s { text-align: center; color: var(--sumi-text-3); user-select: none; }
.wg-git-ln[data-line="added"] :is(.wg-git-n, .wg-git-s) { color: var(--sumi-success); }
.wg-git-ln[data-line="removed"] :is(.wg-git-n, .wg-git-s) { color: var(--sumi-danger); }
.wg-git-code { white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
.wg-git-diffs.is-nowrap .wg-git-rows { overflow-x: auto; display: grid; grid-template-columns: minmax(max-content, 1fr); }
.wg-git-diffs.is-nowrap .wg-git-ln { grid-template-columns: var(--wg-git-num-w) var(--wg-git-num-w) 22px max-content; }
.wg-git-diffs.is-nowrap .wg-git-code { white-space: pre; overflow-wrap: normal; padding-right: 16px; }
.wg-git-note { margin: 0; padding: 16px; color: var(--sumi-text-3); }
.wg-git-empty { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; display: flex; align-items: flex-start; justify-content: center; padding: 22vh 0 48px; }
.wg-git-empty > div { width: 400px; display: flex; flex-direction: column; }
.wg-git-empty h1 { margin: 0; font-size: var(--sumi-fs-20); font-weight: var(--sumi-fw-semi); line-height: 1.3; }
.wg-git-empty p { margin: 6px 0 20px; color: var(--sumi-text-2); }
.wg-git-empty .wg-git-mlabel { padding: 16px 0 4px; }
.wg-git-empty .wg-git-row { margin: 0 -10px; width: calc(100% + 20px); }
.wg-git-row.is-quiet { color: var(--sumi-text-2); }
`;
