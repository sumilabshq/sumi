const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export function sizeSaid(bytes: number): string {
	if (bytes < KILOBYTE) {
		return `${bytes} B`;
	}

	if (bytes < MEGABYTE) {
		return `${Math.round(bytes / KILOBYTE)} KB`;
	}

	return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}
