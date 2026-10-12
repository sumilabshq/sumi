const INLINE = "inline";

// TRADE-OFF: the user agent's margins written in pixels at a 16px root; a heading resized by a class keeps them

export const TAG_WORDS: Readonly<Record<string, string>> = {
	h1: "text-h1 font-bold my-[21px]",
	h2: "text-h2 font-bold my-[13px]",
	h3: "text-h3 font-semibold my-4",
	h4: "text-h4 font-semibold",
	h5: "text-h5 font-semibold",
	h6: "text-h6 font-semibold",
	p: "my-[14px]",
	ul: "pl-10 my-4",
	ol: "pl-10 my-4",
	hr: "border-t my-2",
	span: INLINE,
	label: INLINE,
	abbr: INLINE,
	time: INLINE,
	mark: "inline bg-highlight",
	sub: INLINE,
	sup: INLINE,
	s: INLINE,
	u: INLINE,
	kbd: "inline font-mono",
	b: "inline font-bold",
	strong: "inline font-bold",
	em: INLINE,
	i: INLINE,
	small: "inline text-xs",
	code: "inline font-mono",
	a: "inline text-link",
	button: INLINE,
	input: "inline w-[150px]",
	textarea: "inline w-[150px] min-h-[40px]",
	select: INLINE,
	img: "inline bg-fill items-center justify-center text-xs text-ink-muted overflow-hidden",
	svg: "inline shrink-0",
};

export const SHAPE_HOLDERS: ReadonlySet<string> = new Set(["svg", "g"]);

export const PLACEHOLDER_INK = "text-ink-faint";

const IMAGE_SAID = "image";

export interface OwnText {
	readonly text: string;
	readonly isPlaceholder: boolean;
}

export function ownTextOf(type: string, props: Readonly<Record<string, unknown>>): OwnText | null {
	if (type === "Text" || SHAPE_HOLDERS.has(type)) return null;
	if (type === "img") return { text: textOf(props["alt"]) || IMAGE_SAID, isPlaceholder: true };
	if (type === "input" || type === "textarea") return fieldTextOf(props);
	const { children } = props;
	if (typeof children === "string" || typeof children === "number")
		return { text: String(children), isPlaceholder: false };
	return null;
}

function fieldTextOf(props: Readonly<Record<string, unknown>>): OwnText | null {
	const value = textOf(props["value"]) || textOf(props["defaultValue"]) || textOf(props["children"]);
	if (value) return { text: value, isPlaceholder: false };
	const placeholder = textOf(props["placeholder"]);
	return placeholder ? { text: placeholder, isPlaceholder: true } : null;
}

function textOf(held: unknown): string {
	if (typeof held === "string") return held;
	if (typeof held === "number") return String(held);
	return "";
}
