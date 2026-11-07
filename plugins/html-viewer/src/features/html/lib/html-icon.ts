// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const HTML_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M7.5 7.5 5 10l2.5 2.5M12.5 7.5 15 10l-2.5 2.5M10.9 6.5l-1.8 7" stroke="#000000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	"</mask>",
	'<rect x="2" y="3" width="16" height="14" rx="3.5" fill="#A35CE6" mask="url(#cut)"/>',
	"</svg>",
].join("");
