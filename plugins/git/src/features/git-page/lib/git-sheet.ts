export const GIT_SHEET = `
.wg-git { display: flex; height: 100%; min-height: 0; box-sizing: border-box; background: var(--plate); color: var(--text); font: var(--fw-regular) var(--fs-13)/1.4 var(--font-ui); font-feature-settings: var(--font-features); }
.wg-git * { box-sizing: border-box; }
:where(.wg-git) :where(button, input) { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; text-align: left; }
:where(.wg-git) :where(button) { cursor: pointer; }
.wg-git-glyph { flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wg-git-page { position: relative; display: flex; flex: 1; min-width: 0; min-height: 0; overflow-x: clip; }
.wg-git-row { height: var(--h-row); width: 100%; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-radius: var(--r-md); white-space: nowrap; flex: none; transition: background var(--dur-hover) var(--ease-emphasized); }
.wg-git-row:hover { background: var(--hover); }
.wg-git-row.is-act { background: var(--active); }
.wg-git-row.is-sel { background: var(--selected); font-weight: var(--fw-medium); }
.wg-git-row > .wg-git-glyph { color: var(--text-2); }
.wg-git-row .is-faint { color: var(--text-3); }
.wg-git-nm { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.wg-git-nm.is-fill { flex: 1; min-width: 0; }
.wg-kit-side-panel-row.is-seen { color: var(--text-2); font-weight: var(--fw-regular); }
.wg-git-dim { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--text-3); font-weight: var(--fw-regular); }
.wg-git-lbl { color: var(--text-3); }
.wg-git-hint { flex: none; display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-12); color: var(--text-3); font-weight: var(--fw-regular); }
.wg-git-nums { flex: none; font-size: var(--fs-11); font-variant-numeric: tabular-nums; font-weight: var(--fw-regular); }
.wg-git-add { color: var(--success-text); }
.wg-git-del { color: var(--danger); }
.wg-git-st { width: 16px; flex: none; text-align: center; font: var(--fw-medium) var(--fs-11)/1 var(--font-code); color: var(--warning-text); }
.wg-git-st[data-status="added"] { color: var(--success-text); }
.wg-git-st[data-status="deleted"] { color: var(--danger); }
.wg-git-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning-text); flex: none; }
.wg-git-fold-mark { width: 14px; flex: none; display: inline-flex; color: var(--text-3); transition: transform var(--dur-fast) var(--ease-out-expo); }
.wg-git-folder[aria-expanded="true"] .wg-git-fold-mark { transform: rotate(90deg); }
.wg-git-tree-row { animation: wg-git-row-in var(--dur-fast) var(--ease-out-expo); }
@keyframes wg-git-row-in { from { opacity: 0; transform: translateY(-2px); } }
@media (prefers-reduced-motion: reduce) { .wg-git-tree-row { animation: none; } .wg-git-fold-mark { transition: none; } }
.wg-git-folder > .wg-git-glyph { color: var(--text-2); }
.wg-git-meta { display: flex; gap: 6px; padding: 2px 16px 8px 40px; font-size: var(--fs-12); color: var(--text-2); }
.wg-git-field { height: var(--h-md); flex: none; display: flex; align-items: center; gap: 8px; padding: 0 8px; margin: 2px 8px 6px; background: var(--hover); color: var(--text-3); }
.wg-git-field input { flex: 1; min-width: 0; height: 100%; outline: none; color: var(--text); }
.wg-git-field input::placeholder { color: var(--text-3); }
.wg-git-pick { flex: none; }
.wg-git-pick > .wg-kit-anchor { display: block; }
.wg-kit-pop.wg-git-menu { width: 340px; }
.wg-git-mi-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.wg-git-mi-hint { flex: none; max-width: 45%; display: inline-flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--fs-12); color: var(--text-3); }
.wg-git-mlabel { padding: 8px 10px 4px; font-size: var(--fs-12); color: var(--text-3); }
.wg-git-diffs { --git-diff-inset: 0px; flex: 1; min-width: 0; min-height: 0; margin-right: calc(var(--git-list-w, 256px) + 16px); overflow-x: hidden; overflow-y: auto; }
.wg-git-page.is-list-hidden .wg-git-diffs { margin-right: 0; }
.wg-git-file + .wg-git-file { border-top: 1px solid var(--line); }
.wg-git-fold { width: 24px; height: 24px; flex: none; display: inline-flex; align-items: center; justify-content: center; color: var(--text-2); }
.wg-git-fhead:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.wg-git-fpath { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.wg-git-ftitle { min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.wg-git-fhead { position: sticky; top: 0; z-index: 1; height: 40px; display: flex; align-items: center; gap: 8px; margin-left: calc(-1 * var(--git-diff-inset)); padding: 0 12px 0 calc(16px + var(--git-diff-inset)); background: var(--plate); white-space: nowrap; cursor: pointer; user-select: none; transition: background var(--dur-hover) var(--ease-emphasized); }
.wg-git-fhead:hover { background: linear-gradient(var(--hover), var(--hover)), var(--plate); }
.wg-git-dir { color: var(--text-3); }
.wg-git-base { font-weight: var(--fw-medium); }
.wg-git-gap { flex: 1; }
.wg-git-hidden { height: 28px; display: flex; align-items: center; gap: 8px; padding-left: 72px; font-size: var(--fs-12); color: var(--text-3); background: var(--sunken); }
.wg-git-ln { --git-num-w: max(48px, calc(var(--git-digits, 3) * 1ch + 20px)); display: grid; grid-template-columns: var(--git-num-w) var(--git-num-w) 22px minmax(0, 1fr); font: var(--fw-regular) 12.5px/20px var(--font-code); }
.wg-git-ln[data-line="added"] { background: color-mix(in srgb, var(--success-text) 9%, transparent); }
.wg-git-ln[data-line="removed"] { background: color-mix(in srgb, var(--danger) 8%, transparent); }
.wg-git-n { padding-right: 10px; text-align: right; color: var(--text-3); font-variant-numeric: tabular-nums; user-select: none; }
.wg-git-s { text-align: center; color: var(--text-3); user-select: none; }
.wg-git-ln[data-line="added"] :is(.wg-git-n, .wg-git-s) { color: var(--success-text); }
.wg-git-ln[data-line="removed"] :is(.wg-git-n, .wg-git-s) { color: var(--danger); }
.wg-git-code { white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
.wg-git-diffs.is-nowrap .wg-git-rows { overflow-x: auto; display: grid; grid-template-columns: minmax(max-content, 1fr); }
.wg-git-diffs.is-nowrap .wg-git-ln { grid-template-columns: var(--git-num-w) var(--git-num-w) 22px max-content; }
.wg-git-diffs.is-nowrap .wg-git-code { white-space: pre; overflow-wrap: normal; padding-right: 16px; }
.wg-git-note { margin: 0; padding: 16px; color: var(--text-3); }
.wg-git-empty { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; display: flex; align-items: flex-start; justify-content: center; padding: 22vh 0 48px; }
.wg-git-empty > div { width: 400px; display: flex; flex-direction: column; }
.wg-git-empty h1 { margin: 0; font-size: var(--fs-20); font-weight: var(--fw-semi); line-height: 1.3; }
.wg-git-empty p { margin: 6px 0 20px; color: var(--text-2); }
.wg-git-empty .wg-git-mlabel { padding: 16px 0 4px; }
.wg-git-empty .wg-git-row { margin: 0 -10px; width: calc(100% + 20px); }
.wg-git-row.is-quiet { color: var(--text-2); }
`;
