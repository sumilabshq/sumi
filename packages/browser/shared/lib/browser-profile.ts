export const DEFAULT_BROWSER_PROFILE = "default";

const PROFILE_ID = /^[a-z0-9-]+$/;
const NOT_A_PROFILE = 'a browser profile id is lowercase words joined by hyphens, and "{profileId}" is not one';

export function partitionOfProfile(profileId: string): string {
	return `persist:widgetarium-browser-${checkedProfile(profileId)}`;
}

export function storageKeyOfProfile(store: string, profileId: string): string {
	return `widgetarium-browser-${store}:${checkedProfile(profileId)}`;
}

function checkedProfile(profileId: string): string {
	if (!PROFILE_ID.test(profileId)) {
		throw new Error(NOT_A_PROFILE.replace("{profileId}", profileId));
	}

	return profileId;
}
