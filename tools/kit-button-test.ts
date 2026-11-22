import { buttonClass, buttonLookClass, iconButtonClass } from "../packages/shared/kit/src/utils/class-names.ts";
import type { ButtonLook } from "../packages/shared/kit/src/utils/class-names.ts";
import { check, tally } from "./check-helpers.ts";

type Look = readonly [emphasis: string, tone: string];

const sortedWords = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

const BUTTON_VARIANTS: Readonly<Record<string, Look>> = {
	primary: ["solid", "neutral"],
	default: ["solid", "neutral"],
	accent: ["solid", "brand"],
	tinted: ["soft", "brand"],
	neutral: ["soft", "neutral"],
	secondary: ["soft", "neutral"],
	danger: ["soft", "danger"],
	destructive: ["soft", "danger"],
	wash: ["soft", "wash"],
	outline: ["outline", "neutral"],
	"outline-muted": ["outline", "muted"],
	ghost: ["ghost", "neutral"],
	plain: ["ghost", "brand"],
	link: ["ghost", "brand"],
	page: ["page", "neutral"],
};

const BUTTON_SIZES: Readonly<Record<string, string>> = {
	l: "lg",
	lg: "lg",
	m: "md",
	default: "md",
	s: "sm",
	sm: "sm",
	xs: "xs",
};

const ICON_VARIANTS: Readonly<Record<string, Look>> = {
	primary: ["solid", "neutral"],
	accent: ["solid", "brand"],
	neutral: ["soft", "neutral"],
	raised: ["raised", "neutral"],
	ghost: ["ghost", "neutral"],
	glass: ["glass", "neutral"],
	overlay: ["overlay", "neutral"],
};

const ICON_SIZES: Readonly<Record<string, string>> = { l: "lg", m: "md", s: "sm", xs: "xs", xxs: "2xs" };

function sameClasses(what: string, old: string, look: ButtonLook): void {
	check(what, sortedWords(buttonLookClass(look)), sortedWords(old));
}

for (const [variant, [emphasis, tone]] of Object.entries(BUTTON_VARIANTS)) {
	for (const [size, newSize] of Object.entries(BUTTON_SIZES)) {
		sameClasses(
			`button ${variant} ${size} = ${emphasis}/${tone} ${newSize}`,
			buttonClass({ variant: variant as "primary", size: size as "m" }),
			{ emphasis, tone, size: newSize },
		);
	}
}

for (const [variant, [emphasis, tone]] of Object.entries(ICON_VARIANTS)) {
	for (const [size, newSize] of Object.entries(ICON_SIZES)) {
		sameClasses(
			`icon button ${variant} ${size} = square ${emphasis}/${tone} ${newSize}`,
			iconButtonClass({ variant: variant as "primary", size: size as "m" }),
			{ shape: "square", emphasis, tone, size: newSize },
		);
	}
}

sameClasses("button block carries", buttonClass({ variant: "accent", size: "s", block: true }), {
	emphasis: "solid",
	tone: "brand",
	size: "sm",
	block: true,
});
sameClasses("button block carries without emphasis", buttonClass({ block: true }), { shape: "auto", block: true });
sameClasses("button defaults", buttonClass(), { shape: "auto" });
sameClasses("button defaults with a new size only", buttonClass(), { size: "md" });
sameClasses("square defaults", iconButtonClass(), { shape: "square" });
sameClasses("button className carries", buttonClass({ variant: "ghost", className: "extra" }), {
	emphasis: "ghost",
	tone: "neutral",
	className: "extra",
});
check(
	"tone defaults to neutral",
	buttonLookClass({ emphasis: "solid" }),
	buttonLookClass({ emphasis: "solid", tone: "neutral" }),
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("kit button: all checks passed");
