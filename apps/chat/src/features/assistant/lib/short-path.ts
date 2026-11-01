const HOME_PATH = /^\/(?:Users|home)\/[^/]+(?=\/|$)/;
const LONGEST_SHOWN = 40;
const CUT = "…";

export function shortPathOf(path: string): string {
	const homed = path.replace(HOME_PATH, "~");

	if (homed.length <= LONGEST_SHOWN) {
		return homed;
	}

	return `${CUT}${homed.slice(homed.length - LONGEST_SHOWN + CUT.length)}`;
}

export function folderNameOf(path: string): string {
	return (
		path
			.split("/")
			.filter((part) => part !== "")
			.at(-1) ?? path
	);
}
