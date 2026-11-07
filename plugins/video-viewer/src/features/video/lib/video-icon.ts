// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const VIDEO_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M8.3 6.9v6.2l5-3.1Z" fill="#000000" stroke="#000000" stroke-width="0.8" stroke-linejoin="round"/>',
	"</mask>",
	'<rect x="2" y="3" width="16" height="14" rx="3.5" fill="#E5484D" mask="url(#cut)"/>',
	"</svg>",
].join("");
