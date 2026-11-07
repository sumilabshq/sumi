// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const MARKDOWN_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M11.5 2.5v4h4M6.5 10h7M6.5 13h5" stroke="#000000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	"</mask>",
	'<path d="M5 2.5h6.5l4 4V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V4A1.5 1.5 0 0 1 5 2.5Z" fill="#5E5CE6" mask="url(#cut)"/>',
	"</svg>",
].join("");
