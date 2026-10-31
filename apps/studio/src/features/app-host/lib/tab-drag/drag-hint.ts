const HINT_STYLE: Partial<CSSStyleDeclaration> = {
	position: "fixed",
	zIndex: "2147483000",
	pointerEvents: "none",
	padding: "4px 8px",
	borderRadius: "8px",
	fontFamily: "var(--sumi-font-ui)",
	fontSize: "var(--sumi-fs-12)",
	whiteSpace: "nowrap",
	color: "var(--sumi-text)",
	background: "var(--sumi-plate)",
	boxShadow: "var(--sumi-shadow-pop)",
};

export function dragHintOf(text: string): HTMLElement {
	const hint = document.createElement("div");
	hint.textContent = text;
	hint.setAttribute("role", "status");
	Object.assign(hint.style, HINT_STYLE);
	return hint;
}
