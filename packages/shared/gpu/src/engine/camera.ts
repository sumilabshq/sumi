export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface Viewport {
	readonly width: number;
	readonly height: number;
	readonly dpr: number;
}

export interface WorldRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface Placed {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 8;
const FIT_MARGIN_PX = 64;

export function zoomAround(camera: Camera, screenX: number, screenY: number, factor: number): void {
	const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor));
	const applied = zoom / camera.zoom;
	camera.x = screenX - (screenX - camera.x) * applied;
	camera.y = screenY - (screenY - camera.y) * applied;
	camera.zoom = zoom;
}

export function fitCamera(camera: Camera, placed: readonly Placed[], viewport: Viewport): void {
	if (placed.length === 0) return;
	const right = Math.max(...placed.map((item) => item.x + item.width));
	const bottom = Math.max(...placed.map((item) => item.y + item.height));
	const zoom = Math.min((viewport.width - FIT_MARGIN_PX * 2) / right, (viewport.height - FIT_MARGIN_PX * 2) / bottom);
	camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
	camera.x = (viewport.width - right * camera.zoom) / 2;
	camera.y = (viewport.height - bottom * camera.zoom) / 2;
}

export function visibleRectOf(camera: Camera, viewport: Viewport): WorldRect {
	const { x, y, zoom } = camera;
	return { left: -x / zoom, top: -y / zoom, right: (viewport.width - x) / zoom, bottom: (viewport.height - y) / zoom };
}

export function overlaps(item: Placed, rect: WorldRect): boolean {
	return (
		item.x < rect.right && item.x + item.width > rect.left && item.y < rect.bottom && item.y + item.height > rect.top
	);
}

export function worldOf(camera: Camera, screenX: number, screenY: number): readonly [number, number] {
	return [(screenX - camera.x) / camera.zoom, (screenY - camera.y) / camera.zoom];
}
