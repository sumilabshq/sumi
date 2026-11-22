export const BROWSER_PAGE_SHEET = `
.wg-browser-app { position: relative; display: flex; flex-direction: column; flex: 1; height: 100%; min-height: 0; box-sizing: border-box; margin: 0; overflow: hidden; background: var(--plate); color: var(--text); font-family: var(--font-ui); }
.wg-browser-page-area { position: relative; flex: 1; min-height: 0; overflow: hidden; border-radius: 0 0 var(--r-group) var(--r-group); }
.wg-browser-pages { position: absolute; inset: 0; }
.wg-browser-state, .wg-browser-note { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 40px; overflow: auto; background: var(--plate); text-align: center; }
.wg-browser-state-title { margin: 0; color: var(--text); font-size: 30px; font-weight: var(--fw-medium); line-height: 1.15; letter-spacing: -0.03em; }
.wg-browser-field { display: flex; flex: none; align-items: center; box-sizing: border-box; width: 560px; max-width: 100%; height: 52px; margin-top: 26px; padding: 0 5px 0 19px; gap: 12px; border-radius: 999px; background: var(--hover); color: var(--text-2); }
.wg-browser-field:focus-within { box-shadow: 0 0 0 2px var(--focus-ring); }
.wg-browser-field svg { flex: none; fill: none; stroke: currentColor; }
.wg-browser-field-input { flex: 1; min-width: 0; height: 40px; padding: 0; border: 0; outline: none; background: transparent; color: var(--text); font: inherit; font-size: 16px; }
.wg-browser-field-input::placeholder { color: var(--text-3); }
.wg-browser-field-go { display: grid; flex: none; place-items: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 999px; background: var(--text); color: var(--plate); cursor: pointer; }
.wg-browser-field-go:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.wg-browser-note-title { margin: 0; color: var(--text); font-size: 15px; }
.wg-browser-note-reason { max-width: 540px; margin: 8px 0 0; color: var(--text-2); font-size: 13px; }
`;
