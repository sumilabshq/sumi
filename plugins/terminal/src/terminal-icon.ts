// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const TERMINAL_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M5.5 7.5l2.8 2.5-2.8 2.5M10 13h4.5" stroke="#000000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	"</mask>",
	'<rect x="2" y="3" width="16" height="14" rx="3.5" fill="#2B2B2E" mask="url(#cut)"/>',
	"</svg>",
].join("");
