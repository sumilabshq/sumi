export const CANVAS_ICON = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.6667 -0.6667 21.3333 21.3333" width="16" height="16">',
	'<mask id="canvas-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">',
	'<rect width="20" height="20" fill="#FFFFFF"/>',
	'<circle cx="7" cy="7" r="5.6" fill="none" stroke="#000000" stroke-width="1.2"/>',
	"</mask>",
	'<rect x="7.5" y="7.5" width="10" height="10" fill="#8b5cf6" mask="url(#canvas-cut)"/>',
	'<circle cx="7" cy="7" r="5" fill="#8b5cf6"/>',
	"</svg>",
].join("");

export const CANVAS_ICON_SOURCE = `data:image/svg+xml;utf8,${encodeURIComponent(CANVAS_ICON)}`;
