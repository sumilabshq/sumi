import type { Intent, KeptMenu } from "../../../shared/schema/command-menu.schema.js";

export type MenuAfter =
	| {
			readonly next: KeptMenu;
			readonly isMenuKept: boolean;
			readonly reason: string;
	  }
	| {
			readonly next: null;
			readonly isMenuKept: true;
	  };

const KEEPS_MENU: ReadonlySet<Intent["do"]> = new Set(["close-tab", "pin-chat"]);

export function menuAfter(intent: Intent, was: KeptMenu): MenuAfter {
	if (intent.do === "run" && intent.command === "new-tab") {
		return {
			next: {
				...was,
				door: "new-tab",
			},
			isMenuKept: true,
			reason: `command menu door ${was.door} → new-tab (run New tab)`,
		};
	}

	if (KEEPS_MENU.has(intent.do)) {
		return {
			next: null,
			isMenuKept: true,
		};
	}

	return {
		next: {
			...was,
			isOpen: false,
		},
		isMenuKept: false,
		reason: `command menu open at ${was.door} → shut (${intent.do})`,
	};
}
