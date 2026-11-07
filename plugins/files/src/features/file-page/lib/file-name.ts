export function fileNameOf(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1) || path;
}
