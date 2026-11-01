export interface RegisteredApp {
	readonly id: string;
	readonly name: string;
	readonly ui: string;
	readonly build: string;
}

export type AppPageUrlOf = (app: RegisteredApp) => string;

const SUMI_APP_SCHEME = "sumi-app://";

export function sumiAppPageUrlOf({ id, ui }: RegisteredApp): string {
	return `${SUMI_APP_SCHEME}${id}/${ui}`;
}

export function registeredAppOf(apps: readonly RegisteredApp[], id: string): RegisteredApp | null {
	return apps.find((app) => app.id === id) ?? null;
}
