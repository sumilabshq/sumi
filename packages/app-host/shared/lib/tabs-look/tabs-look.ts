const HOVER_FADE =
	"cv:transition-[background-color] cv:duration-(--sumi-dur-hover) cv:ease-(--sumi-ease) cv:hover:duration-0";

export const SIDEBAR_ROW = `cv:group/row cv:relative cv:flex cv:h-[34px] cv:w-full cv:min-w-0 cv:flex-none cv:cursor-default cv:items-center cv:gap-[10px] cv:rounded-[10px] cv:border-0 cv:bg-transparent cv:px-2 cv:py-0 cv:text-start cv:text-[13px] cv:leading-[1.4] cv:font-normal cv:whitespace-nowrap cv:text-(--sumi-text) cv:[box-shadow:none] cv:outline-none cv:select-none cv:hover:bg-(--sumi-hover) cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)] ${HOVER_FADE}`;

export const SIDEBAR_ROW_SHOWN =
	"cv:data-[shown]:bg-(--sumi-selected) cv:data-[shown]:font-medium cv:data-[shown]:hover:bg-(--sumi-selected)";

export const ROW_WORDS = "cv:min-w-0 cv:flex-1 cv:overflow-hidden cv:text-ellipsis";

export const ICON_BUTTON = `cv:[font:inherit] cv:size-6 cv:rounded-[6px] cv:border-0 cv:p-0 cv:outline-none cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]`;

export const KEY_HINT =
	"cv:rounded-[4px] cv:bg-(--sumi-active) cv:px-1 cv:font-[inherit] cv:text-[11px] cv:leading-4 cv:text-(--sumi-text-2)";
