import type { KeyboardEvent } from "react";

const TAB_SELECTOR = "[role=tab]";
const STEP_BY_KEY: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export function focusNeighbourTab(event: KeyboardEvent<HTMLElement>): void {
	const from = event.target;

	if (!(from instanceof HTMLElement) || from.getAttribute("role") !== "tab") {
		return;
	}

	const tabs = [...event.currentTarget.querySelectorAll<HTMLElement>(TAB_SELECTOR)];
	const target = targetTabOf(tabs, tabs.indexOf(from), event.key);

	if (target !== undefined) {
		event.preventDefault();
		target.focus();
	}
}

function targetTabOf(tabs: readonly HTMLElement[], at: number, key: string): HTMLElement | undefined {
	if (key === "Home") {
		return tabs[0];
	}

	if (key === "End") {
		return tabs.at(-1);
	}

	const step = STEP_BY_KEY[key];
	return step === undefined ? undefined : tabs.at((at + step) % tabs.length);
}
