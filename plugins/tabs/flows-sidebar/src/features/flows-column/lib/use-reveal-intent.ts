import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";

export const CONCEAL_DELAY_MS = 250;

export interface RevealIntent {
	readonly panel: RefObject<HTMLDivElement | null>;
	onEnter(): void;
	onLeave(): void;
}

export function useRevealIntent(): RevealIntent {
	const peek = useCommand(appHost.frameSides.peek);
	const conceal = useCommand(appHost.frameSides.conceal);
	const panel = useRef<HTMLDivElement | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancel = (): void => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	};

	useEffect(() => cancel, []);

	return {
		panel,
		onEnter: () => {
			cancel();
			void peek.run({ side: "left" });
		},
		onLeave: () => {
			cancel();
			timer.current = setTimeout(() => {
				if (!isTyping(panel.current)) {
					void conceal.run({ side: "left" });
				}
			}, CONCEAL_DELAY_MS);
		},
	};
}

function isTyping(panel: HTMLElement | null): boolean {
	const focused = document.activeElement;
	return panel !== null && focused instanceof HTMLInputElement && panel.contains(focused);
}
