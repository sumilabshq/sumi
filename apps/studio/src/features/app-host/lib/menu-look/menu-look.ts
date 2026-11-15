const SUMI_GLASS =
	"cv:[&,&_*]:box-border cv:flex cv:flex-col cv:rounded-none cv:bg-(--sumi-overlay) cv:px-0 cv:py-1 cv:font-[family-name:var(--sumi-font-ui)] cv:text-[13px] cv:leading-[1.4] cv:font-normal cv:text-(--sumi-text) cv:[box-shadow:var(--sumi-shadow-pop)] cv:outline-none cv:[-webkit-backdrop-filter:var(--sumi-blur-pop)] cv:[backdrop-filter:var(--sumi-blur-pop)] cv:[&>.wg-kit-pop-inner]:p-0";

export const POINTER_MENU = `${SUMI_GLASS} cv:w-[248px] cv:min-w-0 cv:gap-px`;

export const POINTER_SUBMENU = `${SUMI_GLASS} cv:min-w-[180px] cv:gap-px`;

export const POINTER_ITEM =
	"cv:flex cv:min-h-7 cv:w-full cv:cursor-default cv:items-center cv:gap-2 cv:rounded-none cv:bg-transparent cv:px-2 cv:py-1 cv:text-start cv:text-[13px] cv:font-normal cv:text-(--sumi-text) cv:outline-none cv:select-none cv:before:hidden cv:hover:bg-(--sumi-hover) cv:focus:bg-(--sumi-hover) cv:data-[disabled]:cursor-default cv:data-[disabled]:bg-transparent cv:data-[disabled]:text-(--sumi-text-3) cv:data-[state=open]:bg-(--sumi-hover) cv:[&>svg]:text-(--sumi-text-2) cv:data-[disabled]:[&>svg]:text-(--sumi-text-3) cv:[&>.wg-kit-menu-chevron]:size-3";

export const POINTER_LINE = "cv:mx-0 cv:my-1 cv:h-px cv:flex-none cv:bg-(--sumi-line)";

export const SECTION_MENU = "cv:w-[250px] cv:min-w-0";
