export const CANVAS_APP = "canvas";
export const HOME_ADDRESS = "";
export const HOME_TITLE = "Canvases";
export const HOME_ICON = "shapes";

export function canvasHrefOf(canvasId: string): string {
	return `/${canvasId}`;
}

export function chatHrefOf(chatId: string): string {
	return `sumi://chat/${chatId}`;
}
