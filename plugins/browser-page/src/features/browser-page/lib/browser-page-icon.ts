// TRADE-OFF: app art keeps its own colours in both themes, as the studio's built-in art does
export const BROWSER_PAGE_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
	'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<path d="M2.6 10h14.8M10 2.2c2.2 2.1 3.2 4.7 3.2 7.8s-1 5.7-3.2 7.8M10 2.2C7.8 4.3 6.8 6.9 6.8 10s1 5.7 3.2 7.8" stroke="#000000" stroke-width="1.4" fill="none"/>',
	"</mask>",
	'<circle cx="10" cy="10" r="8" fill="#3D8EF0" mask="url(#cut)"/>',
	"</svg>",
].join("");
