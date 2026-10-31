import type { AppEvent } from "@sumi/contract";

export type FrameLink = Extract<AppEvent, { readonly type: "open-link" }>;

export interface LinkToOpen {
	readonly href: string;
	readonly opensNew: boolean;
}

const MOST_LINKS = 5;
const LINKS_WINDOW_MS = 10_000;

// TODO: "split" opens a tab until a link can be placed beside the shown tab.
export function linkToOpenOf({ href, where }: FrameLink): LinkToOpen {
	return {
		href,
		opensNew: where !== "here",
	};
}

export class FrameLinkPace {
	private opened: readonly number[] = [];

	admits(now: number): boolean {
		const recent = this.opened.filter((at) => now - at < LINKS_WINDOW_MS);

		if (recent.length >= MOST_LINKS) {
			this.opened = recent;
			return false;
		}

		this.opened = [...recent, now];
		return true;
	}
}
