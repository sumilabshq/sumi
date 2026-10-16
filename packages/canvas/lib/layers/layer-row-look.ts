import type { LayerKind } from "@widgetarium/behaviors";

export const KIND_ICON: Readonly<Record<LayerKind, string>> = {
	widget: "puzzle",
	row: "columns-3",
	column: "rows-3",
	grid: "grid-2x2",
	group: "square",
	input: "text-cursor-input",
	button: "mouse-pointer-click",
	text: "type",
	picture: "image",
};

export const ROW =
	"cv:flex cv:h-[26px] cv:w-max cv:min-w-full cv:cursor-pointer cv:items-center cv:gap-1.5 cv:whitespace-nowrap cv:rounded-md cv:pr-2 cv:text-base cv:text-ink cv:transition-[background-color,box-shadow] cv:hover:bg-raise cv:hover:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] cv:data-[picked]:bg-raise cv:data-[picked]:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] cv:data-[kind=widget]:cursor-grab cv:data-[kind=widget]:text-brand cv:group-data-[dragging]/tree:transition-transform cv:data-[lifted]:relative cv:data-[lifted]:z-[2] cv:data-[lifted]:bg-raise cv:data-[lifted]:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge),0_8px_20px_-8px_var(--wg-overlay-scrim)] cv:data-[lifted]:transition-none";

export const OPENER =
	"cv:grid cv:size-[18px] cv:flex-none cv:place-items-center cv:rounded-[5px] cv:border-0 cv:bg-transparent cv:p-0 cv:text-muted-foreground cv:shadow-none cv:transition-[background-color,box-shadow]";
