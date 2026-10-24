export const PANEL_ROW_PICKABLE =
	"cv:flex cv:cursor-pointer cv:items-center cv:whitespace-nowrap cv:rounded-full cv:text-sm cv:text-ink cv:data-[quiet]:text-muted-foreground cv:transition-[background-color] cv:hover:bg-group/60 cv:data-[picked]:bg-group";

export const PAGE_ROW_SHAPE = `${PANEL_ROW_PICKABLE} cv:h-9 cv:flex-none cv:gap-2 cv:px-3`;

export const PAGE_ROW = `${PAGE_ROW_SHAPE} cv:data-[picked]:font-medium`;

export const LAYER_ROW_BASE = `${PANEL_ROW_PICKABLE} cv:group/row cv:relative cv:box-border cv:h-[30px] cv:w-full cv:min-w-0 cv:gap-1.5 cv:pr-3`;

export const PANEL_ROW_INSET_PX = 12;

export const PANEL_ROW_INDENT_PX = 14;
