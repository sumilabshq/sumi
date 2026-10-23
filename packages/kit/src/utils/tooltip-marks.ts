export type TooltipSide = "top" | "bottom" | "left" | "right";
export type TooltipAlign = "center" | "start";

export interface TooltipAsk {
	readonly said: string;
	readonly keys?: string | null;
	readonly detail?: string | null;
	readonly side?: TooltipSide;
	readonly align?: TooltipAlign;
}

export interface TooltipSaid {
	readonly said: string;
	readonly keys: string | null;
	readonly detail: string | null;
	readonly side: TooltipSide;
	readonly align: TooltipAlign;
}

export interface TooltipMarks {
	readonly "data-tip-said": string;
	readonly "data-tip-keys": string | undefined;
	readonly "data-tip-detail": string | undefined;
	readonly "data-tip-side": TooltipSide | undefined;
	readonly "data-tip-align": TooltipAlign | undefined;
}

export const TOOLTIP_TARGET = "[data-tip-said]";
export const TOOLTIP_MARK_NAMES = [
	"data-tip-said",
	"data-tip-keys",
	"data-tip-detail",
	"data-tip-side",
	"data-tip-align",
];

const SIDES: readonly TooltipSide[] = ["top", "bottom", "left", "right"];

export function tooltipMarks(ask: TooltipAsk): TooltipMarks {
	return {
		"data-tip-said": ask.said,
		"data-tip-keys": ask.keys ?? undefined,
		"data-tip-detail": ask.detail ?? undefined,
		"data-tip-side": ask.side,
		"data-tip-align": ask.align,
	};
}

export function tooltipSaidOf(target: Element): TooltipSaid | null {
	const said = target.getAttribute("data-tip-said");
	if (said === null || said === "") {
		return null;
	}

	const side = SIDES.find((one) => one === target.getAttribute("data-tip-side")) ?? "top";
	return {
		said,
		keys: target.getAttribute("data-tip-keys"),
		detail: target.getAttribute("data-tip-detail"),
		side,
		align: target.getAttribute("data-tip-align") === "start" ? "start" : "center",
	};
}
