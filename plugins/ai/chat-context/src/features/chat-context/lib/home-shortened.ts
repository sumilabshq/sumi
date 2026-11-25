const HOME_PREFIX = /^\/(?:Users|home)\/[^/]+(?=\/|$)/;

// TRADE-OFF: home guessed from /Users/<name> and /home/<name>; the real home folder is better, but no query offers it
export function homeShortened(folder: string): string {
	return folder.replace(HOME_PREFIX, "~");
}
