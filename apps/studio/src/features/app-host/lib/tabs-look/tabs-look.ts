const EDGE_TO_EDGE_FILL =
	"cv:isolate cv:before:absolute cv:before:inset-y-0 cv:before:right-0 cv:before:left-[-100vw] cv:before:-z-10 cv:before:content-[''] cv:before:transition-[background-color] cv:before:duration-(--sumi-dur-hover) cv:hover:before:bg-(--sumi-hover) cv:hover:before:duration-0 cv:focus-visible:before:bg-(--sumi-hover) cv:active:before:bg-(--sumi-active)";

export const SIDEBAR_ROW = `cv:group/row cv:relative cv:flex cv:h-[30px] cv:w-full cv:min-w-0 cv:flex-none cv:cursor-default cv:items-center cv:gap-[10px] cv:rounded-none cv:border-0 cv:bg-transparent cv:px-5 cv:py-0 cv:text-start cv:text-[13px] cv:leading-[1.5] cv:font-normal cv:whitespace-nowrap cv:text-(--sumi-text-2) cv:[box-shadow:none] cv:outline-none cv:select-none cv:hover:text-(--sumi-text) cv:focus-visible:text-(--sumi-text) ${EDGE_TO_EDGE_FILL}`;

export const SIDEBAR_ROW_SHOWN =
	"cv:data-[shown]:font-medium cv:data-[shown]:text-(--sumi-text) cv:data-[shown]:before:bg-(--sumi-selected) cv:data-[shown]:hover:before:bg-(--sumi-selected)";

export const FOLD_HOST_ROW = "cv:[&:not([data-shown]):has([data-tabs-fold]:hover)]:before:bg-transparent";

const HUES =
	"cv:data-[hue=red]:[--group-hue:var(--sumi-hue-red)] cv:data-[hue=orange]:[--group-hue:var(--sumi-hue-orange)] cv:data-[hue=amber]:[--group-hue:var(--sumi-hue-amber)] cv:data-[hue=green]:[--group-hue:var(--sumi-hue-green)] cv:data-[hue=teal]:[--group-hue:var(--sumi-hue-teal)] cv:data-[hue=blue]:[--group-hue:var(--sumi-hue-blue)] cv:data-[hue=purple]:[--group-hue:var(--sumi-hue-purple)] cv:data-[hue=pink]:[--group-hue:var(--sumi-hue-pink)]";

export const SIDEBAR_CARD = `cv:group/card cv:relative cv:flex cv:flex-none cv:flex-col cv:rounded-none cv:not-data-[hue]:[--group-hue:initial] ${HUES}`;

export const CARD_RADIUS_PX = 0;

export const NESTED_ROWS = "cv:relative cv:flex cv:flex-col cv:ps-[26px]";

export const CARD_HEAD_LOOK =
	"cv:relative cv:flex cv:h-[30px] cv:w-full cv:min-w-0 cv:flex-none cv:items-center cv:gap-[10px] cv:rounded-none cv:border-0 cv:bg-transparent cv:px-5 cv:py-0 cv:text-start cv:font-[inherit] cv:text-[13px] cv:font-medium cv:whitespace-nowrap cv:text-(--sumi-text) cv:[box-shadow:none] cv:outline-none cv:select-none";

export const CARD_HEAD = `cv:group/head cv:cursor-default ${CARD_HEAD_LOOK} ${EDGE_TO_EDGE_FILL}`;

export const CARD_HEAD_NAME = "cv:min-w-0 cv:flex-1 cv:overflow-hidden cv:text-ellipsis cv:whitespace-nowrap";

export const CARD_HEAD_ICON = "cv:flex cv:size-5 cv:flex-none cv:items-center cv:justify-center cv:not-italic";

export const CARD_HEAD_COUNT = "cv:ms-auto cv:text-[12px] cv:font-normal cv:text-(--sumi-text-3)";

export const HOVER_SHOWN =
	"cv:opacity-0 cv:transition-[background-color,opacity] cv:duration-(--sumi-dur-hover) cv:ease-(--sumi-ease) cv:motion-reduce:transition-none cv:focus-visible:opacity-100 cv:data-[folded]:opacity-100";

export const ROW_WORDS = "cv:min-w-0 cv:flex-1 cv:overflow-hidden cv:text-ellipsis";

export const ICON_BUTTON = `cv:[font:inherit] cv:size-6 cv:rounded-none cv:border-0 cv:p-0 cv:outline-none cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]`;

export const KEY_HINT =
	"cv:rounded-none cv:bg-(--sumi-active) cv:px-1 cv:font-[inherit] cv:text-[11px] cv:leading-4 cv:text-(--sumi-text-2)";
