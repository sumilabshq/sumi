// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const IMAGE_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<circle cx="7.5" cy="7.8" r="1.6" fill="#000000"/>',
	'<path d="M2.5 14.5 7 10.5l3 2.8 2.4-2.2 5.1 4.4" stroke="#000000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	"</mask>",
	'<rect x="2" y="3" width="16" height="14" rx="3.5" fill="#E8A33D" mask="url(#cut)"/>',
	"</svg>",
].join("");
