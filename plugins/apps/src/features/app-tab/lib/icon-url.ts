export function iconUrlOf(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
