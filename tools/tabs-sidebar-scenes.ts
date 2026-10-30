import type { AskedPage } from "./chrome-ask.ts";

export const CENTRE_OF = `((selector) => { const el = document.querySelector(selector); if (!el) return null; const box = el.getBoundingClientRect(); return [box.left + box.width / 2, box.top + box.height / 2]; })`;

export async function centreOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const at = await page.ask(`${CENTRE_OF}(${JSON.stringify(selector)})`);

	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		throw new Error(`nothing on the page answers ${selector}`);
	}

	return [at[0], at[1]];
}

export async function bottomOf(page: AskedPage, selector: string): Promise<readonly [number, number]> {
	const at = await page.ask(
		`((selector) => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box ? [box.left + box.width / 2, box.bottom] : null; })(${JSON.stringify(selector)})`,
	);

	if (!Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
		throw new Error(`nothing on the page answers ${selector}`);
	}

	return [at[0], at[1]];
}

export function pointedAt(selector: string): string {
	return `((selector) => { const el = document.querySelector(selector); const box = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 })); return true; })(${JSON.stringify(selector)})`;
}
