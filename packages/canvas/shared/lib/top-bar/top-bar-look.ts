export const TOP_BAR_HEIGHT = "cv:h-12";

export const RAISED_PILL = `${TOP_BAR_HEIGHT} cv:box-border cv:rounded-full cv:bg-raise`;

export const GHOST_HEIGHT = "cv:h-[var(--sumi-h-sm)]";

const GHOST_HOVER =
	"cv:bg-transparent cv:transition-[background-color] cv:duration-[var(--sumi-dur-fast)] cv:hover:bg-[var(--sumi-hover)] cv:hover:duration-0";

export const GHOST_TEXT_BUTTON = `${GHOST_HEIGHT} cv:rounded-[var(--sumi-r-sm)] cv:px-[var(--sumi-sp-3)] cv:text-[length:var(--sumi-fs-13)] cv:font-normal cv:text-[var(--sumi-text)] cv:[&_svg]:size-[var(--sumi-icon-sm)] cv:[&_svg]:text-[var(--sumi-text-3)] ${GHOST_HOVER}`;

export const GHOST_LABEL = `${GHOST_HEIGHT} cv:px-[var(--sumi-sp-2)] cv:text-[length:var(--sumi-fs-13)] cv:text-[var(--sumi-text-2)]`;
