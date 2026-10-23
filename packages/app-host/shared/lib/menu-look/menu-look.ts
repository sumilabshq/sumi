const SUMI_GLASS =
	"cv:[&,&_*]:box-border cv:flex cv:flex-col cv:rounded-[12px] cv:bg-(--sumi-overlay) cv:p-1 cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.4] cv:font-normal cv:text-(--sumi-text) cv:[box-shadow:var(--sumi-shadow-pop)] cv:outline-none cv:[-webkit-backdrop-filter:var(--sumi-blur-pop)] cv:[backdrop-filter:var(--sumi-blur-pop)] cv:[&>.wg-kit-pop-inner]:p-0";

export const POINTER_MENU = `${SUMI_GLASS} cv:w-[248px] cv:min-w-0 cv:gap-px`;

export const POINTER_SUBMENU = `${SUMI_GLASS} cv:min-w-[180px] cv:gap-px`;

export const POINTER_ITEM =
	"cv:flex cv:min-h-7 cv:w-full cv:cursor-default cv:items-center cv:gap-2 cv:rounded-[6px] cv:bg-transparent cv:px-2 cv:py-1 cv:text-start cv:text-[13px] cv:font-normal cv:text-(--sumi-text) cv:outline-none cv:select-none cv:before:hidden cv:hover:bg-(--sumi-hover) cv:focus:bg-(--sumi-hover) cv:data-[disabled]:cursor-default cv:data-[disabled]:bg-transparent cv:data-[disabled]:text-(--sumi-text-3) cv:data-[state=open]:bg-(--sumi-hover) cv:[&>svg]:text-(--sumi-text-2) cv:data-[disabled]:[&>svg]:text-(--sumi-text-3) cv:[&>.wg-kit-menu-chevron]:size-3";

export const POINTER_LINE = "cv:mx-2 cv:my-1 cv:h-px cv:flex-none cv:bg-(--sumi-line)";

export const SECTION_MENU = "cv:w-[250px] cv:min-w-0";

export const GROUP_MENU = "cv:w-[270px] cv:min-w-0";

export const BOARD_ITEM =
	"cv:flex cv:h-8 cv:w-full cv:cursor-default cv:items-center cv:gap-[10px] cv:rounded-[8px] cv:border-0 cv:bg-transparent cv:px-[10px] cv:py-0 cv:text-start cv:font-[inherit] cv:text-[13px] cv:font-normal cv:text-(--sumi-text) cv:[box-shadow:none] cv:outline-none cv:whitespace-nowrap cv:select-none cv:before:hidden cv:hover:bg-(--sumi-hover) cv:focus:bg-(--sumi-active) cv:focus-visible:bg-(--sumi-active) cv:[&>svg]:text-(--sumi-text-2)";

export const BOARD_LINE = "cv:-mx-1 cv:my-1 cv:h-px cv:flex-none cv:bg-(--sumi-line)";

export const BOARD_LABEL = "cv:px-[10px] cv:pt-1.5 cv:pb-0.5 cv:text-[12px] cv:text-(--sumi-text-3)";
