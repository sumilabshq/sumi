// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const GIT_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M7.5 5.5v7M7.5 15.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12.5 9a4.5 4.5 0 0 1-4.5 4.5" stroke="#000000" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
	"</mask>",
	'<rect x="2" y="2" width="16" height="16" rx="4" fill="#E5532D" mask="url(#cut)"/>',
	"</svg>",
].join("");
