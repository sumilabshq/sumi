export const CONTRACT_VERSION = "0.3.1";

export const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export const RANGE_PATTERN = /^\^(\d+)\.(\d+)(?:\.(\d+))?$/;

export const CONTRACT_RANGE = `^${CONTRACT_VERSION.split(".").slice(0, 2).join(".")}`;

interface Version {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
}

export function contractRefusal(appRange: string, sumiVersion: string): string | null {
	const floor = parseVersion(RANGE_PATTERN, appRange);
	const held = parseVersion(VERSION_PATTERN, sumiVersion);
	if (!floor || !held) {
		return unreadableRefusal(appRange, sumiVersion);
	}

	if (isBelow(held, floor)) {
		return `This app needs contract ${appRange} and Sumi speaks ${sumiVersion}: update Sumi`;
	}

	if (!isSameLine(held, floor)) {
		return `This app was built for contract ${appRange} and Sumi speaks ${sumiVersion}: update the app`;
	}

	return null;
}

function parseVersion(pattern: RegExp, text: string): Version | null {
	const match = pattern.exec(text);
	if (!match) {
		return null;
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3] ?? 0),
	};
}

function isBelow(held: Version, floor: Version): boolean {
	if (held.major !== floor.major) {
		return held.major < floor.major;
	}

	if (held.minor !== floor.minor) {
		return held.minor < floor.minor;
	}

	return held.patch < floor.patch;
}

function isSameLine(held: Version, floor: Version): boolean {
	if (floor.major === 0 && floor.minor === 0) {
		return held.major === 0 && held.minor === 0 && held.patch === floor.patch;
	}

	if (floor.major === 0) {
		return held.major === 0 && held.minor === floor.minor;
	}

	return held.major === floor.major;
}

function unreadableRefusal(appRange: string, sumiVersion: string): string {
	if (!RANGE_PATTERN.test(appRange)) {
		return `"${appRange}" is not a contract range: an app names one as ^major.minor, such as ^1.4`;
	}

	return `"${sumiVersion}" is not a contract version: Sumi names its own as major.minor.patch`;
}
