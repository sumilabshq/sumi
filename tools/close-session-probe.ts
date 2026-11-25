import type { AskedPage } from "./chrome-ask.ts";
import { rowOf } from "./flows-sidebar-harness.ts";

export const SESSION_ROW = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";
export const RUNNING_SESSION = "Composer redesign";
export const IDLE_SESSION = "Plugin layout";

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface KeyHintFit {
	readonly text: string;
	readonly height: number;
	readonly padStart: number;
	readonly padEnd: number;
	readonly textInside: boolean;
	readonly fromButtonEnd: number;
	readonly fromButtonTop: number;
	readonly fromButtonBottom: number;
}

export interface DialogFit {
	readonly width: number;
	readonly border: string;
	readonly hints: readonly KeyHintFit[];
	readonly footer: Box;
	readonly panel: Box;
}

export const closeOf = (name: string): string => `${rowOf(SESSION_ROW, name)}.querySelector(".sumi-flows-close")`;

export async function boxOf(page: AskedPage, expression: string): Promise<Box> {
	return (await page.ask(
		`(() => { const box = (${expression}).getBoundingClientRect(); return { x: box.left, y: box.top, width: box.width, height: box.height }; })()`,
	)) as Box;
}

export async function dialogFitOf(page: AskedPage): Promise<DialogFit> {
	return (await page.ask(`(() => {
		const plain = (box) => ({ x: box.left, y: box.top, width: box.width, height: box.height });
		const panel = document.querySelector("[data-slot=alert-dialog-content]");
		const hints = [...panel.querySelectorAll(".wg-kit-modal-footer .wg-kit-kbd")].map((hint) => {
			const box = hint.getBoundingClientRect();
			const range = document.createRange();
			range.selectNodeContents(hint);
			const text = range.getBoundingClientRect();
			const button = hint.parentElement.getBoundingClientRect();
			return {
				text: hint.textContent,
				height: box.height,
				padStart: text.left - box.left,
				padEnd: box.right - text.right,
				textInside: text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom,
				fromButtonEnd: button.right - box.right,
				fromButtonTop: box.top - button.top,
				fromButtonBottom: button.bottom - box.bottom,
			};
		});
		return {
			width: panel.getBoundingClientRect().width,
			border: getComputedStyle(panel).borderTopWidth,
			hints,
			footer: plain(panel.querySelector(".wg-kit-modal-footer").getBoundingClientRect()),
			panel: plain(panel.getBoundingClientRect()),
		};
	})()`)) as DialogFit;
}
