import { TONE_CLASSES } from "../constants/tones";
import { cn, variants } from "./cn";
import type { ClassNameValue } from "./cn";

const BUTTON_WORDS = {
	variant: {
		primary: "is-primary",
		accent: "is-accent",
		tinted: "is-tinted",
		neutral: "",
		ghost: "is-ghost",
		plain: "is-plain",
		danger: "is-danger",
		default: "is-primary",
		secondary: "",
		destructive: "is-danger",
		outline: "is-outline",
		"outline-muted": "is-outline is-muted",
		wash: "is-wash",
		page: "is-page",
		lifted: "is-lifted",
		link: "is-plain",
	},
	size: {
		l: "is-l",
		m: "is-m",
		s: "is-s",
		xs: "is-xs",
		lg: "is-l",
		default: "is-m",
		sm: "is-s",
		icon: "is-m is-icon",
		"icon-lg": "is-l is-icon",
		"icon-sm": "is-s is-icon",
		"icon-xs": "is-xs is-icon",
	},
	block: { true: "is-block" },
};

const ICON_BUTTON_WORDS = {
	variant: {
		primary: "is-primary",
		accent: "is-accent",
		neutral: "",
		raised: "is-raised",
		ghost: "is-ghost",
		glass: "wg-kit-glass",
		overlay: "is-overlay",
	},
	size: { l: "is-l", m: "is-m", s: "is-s", xs: "is-xs" },
};

const PILL_WORDS = {
	tone: TONE_CLASSES,
	variant: {
		soft: "",
		solid: "is-solid",
		outline: "is-outline",
		dot: "is-dot",
		text: "is-text",
		default: "is-primary",
		secondary: "is-secondary",
		destructive: "is-destructive",
		chip: "is-chip",
	},
	size: { s: "is-s", m: "" },
};

const CARD_WORDS = {
	variant: { light: "", solid: "is-solid" },
	lift: { true: "is-lifted" },
	selected: { true: "is-selected" },
};

const SIDEBAR_WORDS = {
	mode: { full: "", minimal: "is-minimal" },
	surface: { solid: "", glass: "is-glass", edge: "is-edge", soft: "is-soft", chrome: "is-chrome" },
	at: { start: "", end: "is-end" },
};

const FIELD_WORDS = {
	size: { m: "", s: "is-s" },
	block: { true: "is-block" },
	variant: { framed: "", bare: "is-bare", filled: "is-filled", outlined: "is-outlined", raised: "is-raised" },
};

const DIALOG_WORDS = { size: { m: "", s: "is-s" } };

export type ButtonVariant = keyof (typeof BUTTON_WORDS)["variant"];

export type ButtonSize = keyof (typeof BUTTON_WORDS)["size"];

export type SquareButtonVariant = keyof (typeof ICON_BUTTON_WORDS)["variant"];

export type SquareButtonSize = keyof (typeof ICON_BUTTON_WORDS)["size"];

export type PillVariant = keyof (typeof PILL_WORDS)["variant"];

export type PillSize = keyof (typeof PILL_WORDS)["size"];

export type SidebarMode = keyof (typeof SIDEBAR_WORDS)["mode"];

export type SidebarSurface = keyof (typeof SIDEBAR_WORDS)["surface"];

export type SidebarAt = keyof (typeof SIDEBAR_WORDS)["at"];

export type FieldSize = keyof (typeof FIELD_WORDS)["size"];

export type FieldVariant = keyof (typeof FIELD_WORDS)["variant"];

export type DialogSize = keyof (typeof DIALOG_WORDS)["size"];

const FORM_WORDS: Readonly<Record<ButtonForm, string>> = { rect: "is-rect", round: "is-round" };

export type ButtonForm = "rect" | "round";

export const buttonFormClass = (form: ButtonForm | undefined): string => (form === undefined ? "" : FORM_WORDS[form]);

export const buttonClass = variants("wg-kit-btn", BUTTON_WORDS, { variant: "neutral", size: "m" });

export const iconButtonClass = variants("wg-kit-icon", ICON_BUTTON_WORDS, { variant: "neutral", size: "m" });

export const partButtonClass = variants("wg-kit-icon is-ghost is-part", {});

// TODO: fold wash, muted, page, raised, glass, overlay into the four emphases, look changes
const BUTTON_LOOKS: Readonly<Record<string, ButtonVariant>> = {
	"solid-neutral": "primary",
	"solid-brand": "accent",
	"soft-neutral": "neutral",
	"soft-brand": "tinted",
	"soft-danger": "danger",
	"soft-wash": "wash",
	"outline-neutral": "outline",
	"outline-muted": "outline-muted",
	"ghost-neutral": "ghost",
	"ghost-brand": "plain",
	"page-neutral": "page",
};

const SQUARE_LOOKS: Readonly<Record<string, SquareButtonVariant>> = {
	"solid-neutral": "primary",
	"solid-brand": "accent",
	"soft-neutral": "neutral",
	"ghost-neutral": "ghost",
	"raised-neutral": "raised",
	"glass-neutral": "glass",
	"overlay-neutral": "overlay",
};

const BUTTON_LOOK_SIZES: Readonly<Record<string, ButtonSize>> = { xs: "xs", sm: "s", md: "m", lg: "l" };

const SQUARE_LOOK_SIZES: Readonly<Record<string, SquareButtonSize>> = {
	xs: "xs",
	sm: "s",
	md: "m",
	lg: "l",
};

export interface ButtonLook {
	readonly shape?: string | undefined;
	readonly emphasis?: string | undefined;
	readonly tone?: string | undefined;
	readonly size?: string | undefined;
	readonly block?: boolean | undefined;
	readonly className?: ClassNameValue;
}

export function buttonLookClass({ shape, emphasis, tone = "neutral", size, block, className }: ButtonLook): string {
	const look = `${emphasis}-${tone}`;
	if (shape === "square") {
		return iconButtonClass({
			variant: emphasis ? SQUARE_LOOKS[look] : undefined,
			size: size ? SQUARE_LOOK_SIZES[size] : undefined,
			className,
		});
	}
	return buttonClass({
		variant: emphasis ? BUTTON_LOOKS[look] : undefined,
		size: size ? BUTTON_LOOK_SIZES[size] : undefined,
		block,
		className,
	});
}

export const pillClass = variants("wg-kit-pill wg-kit-inked", PILL_WORDS, {
	tone: "neutral",
	variant: "soft",
	size: "m",
});

export const cardClass = variants("wg-kit-card", CARD_WORDS, { variant: "light" });

export const plateClass = variants(cn("wg-kit-plate", cardClass({ variant: "solid" })), {});

export const listClass = variants(cn("wg-kit-list", cardClass({ variant: "solid" })), {});

export const rowClass = variants("wg-kit-row", { pressable: { true: "is-pressable" } });

export const ROW_PART = {
	badge: "wg-kit-row-badge",
	label: "wg-kit-row-label",
	text: "wg-kit-row-text",
	supporting: "wg-kit-row-supporting",
	value: "wg-kit-row-value",
} as const;

export const glassClass = variants("wg-kit-glass", {});

export const softGlassClass = variants("wg-kit-soft-glass", {});

export const sidebarClass = variants(cn("wg-kit-side", cardClass({ variant: "light", lift: true })), SIDEBAR_WORDS, {
	mode: "full",
	surface: "solid",
	at: "start",
});

export const fieldClass = variants("wg-kit-field", FIELD_WORDS, { size: "m", variant: "framed" });

export const dialogClass = variants("", DIALOG_WORDS, { size: "m" });
