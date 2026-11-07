// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const CODE_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M8 6.5c-1.2 0-1.5.6-1.5 1.5v.8c0 .7-.4 1.2-1.2 1.2.8 0 1.2.5 1.2 1.2v.8c0 .9.3 1.5 1.5 1.5M12 6.5c1.2 0 1.5.6 1.5 1.5v.8c0 .7.4 1.2 1.2 1.2-.8 0-1.2.5-1.2 1.2v.8c0 .9-.3 1.5-1.5 1.5" stroke="#000000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
	"</mask>",
	'<rect x="2" y="3" width="16" height="14" rx="3.5" fill="#2E9E6B" mask="url(#cut)"/>',
	"</svg>",
].join("");
