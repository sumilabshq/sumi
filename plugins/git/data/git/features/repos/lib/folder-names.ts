const SEPARATOR = "/";

export function nameOf(folder: string): string {
	const trimmed = withoutTrailingSeparator(folder);
	return trimmed.slice(trimmed.lastIndexOf(SEPARATOR) + 1);
}

export function parentOf(folder: string): string {
	const trimmed = withoutTrailingSeparator(folder);
	const cut = trimmed.lastIndexOf(SEPARATOR);
	return cut <= 0 ? SEPARATOR : trimmed.slice(0, cut);
}

export function folderIn(parent: string, name: string): string {
	return `${withoutTrailingSeparator(parent)}${SEPARATOR}${name}`;
}

function withoutTrailingSeparator(folder: string): string {
	return folder.length > 1 && folder.endsWith(SEPARATOR) ? folder.slice(0, -1) : folder;
}
