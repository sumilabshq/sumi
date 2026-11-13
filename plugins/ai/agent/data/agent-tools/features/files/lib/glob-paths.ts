const SPECIAL = /[.+^${}()|[\]\\]/g;
const ANY_FOLDERS = "\u0000";
const ANY_PATH = "\u0001";

export function globRegexOf(pattern: string): RegExp {
	const body = pattern
		.replace(SPECIAL, "\\$&")
		.replaceAll("**/", ANY_FOLDERS)
		.replaceAll("**", ANY_PATH)
		.replaceAll("*", "[^/]*")
		.replaceAll("?", "[^/]")
		.replaceAll(ANY_FOLDERS, "(?:.*/)?")
		.replaceAll(ANY_PATH, ".*");
	return new RegExp(`^${body}$`);
}

export function matchedPathsOf(found: string, folder: string, pattern: string): string[] {
	const glob = globRegexOf(pattern);
	const prefix = folder.endsWith("/") ? folder : `${folder}/`;
	return found
		.split("\n")
		.filter((path) => path.startsWith(prefix) && glob.test(path.slice(prefix.length)))
		.sort();
}
