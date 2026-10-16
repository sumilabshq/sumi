import type { StartedProject } from "../app/widgetarium-app";

export type Platform = "obsidian" | "web" | "mobile" | "desktop" | "server";
export type AppPlatform = Exclude<Platform, "server">;

declare global {
	const __WG_PLATFORM__: Platform;
}

export const PLATFORMS: readonly Platform[] = ["obsidian", "web", "mobile", "desktop", "server"];

export interface ObsidianHost {
	readonly platform: "obsidian";
}

export interface WebHost {
	readonly platform: "web";
	readonly project: StartedProject;
}

export interface MobileHost {
	readonly platform: "mobile";
}

export interface DesktopHost {
	readonly platform: "desktop";
}

export interface ServerHost {
	readonly platform: "server";
	readonly env: Readonly<Record<string, string | undefined>>;
}

export interface HostsByPlatform {
	readonly obsidian: ObsidianHost;
	readonly web: WebHost;
	readonly mobile: MobileHost;
	readonly desktop: DesktopHost;
	readonly server: ServerHost;
}

export type HostOf<P extends Platform> = HostsByPlatform[P];
export type AnyHost = HostOf<Platform>;

export function builtFor(): Platform {
	return __WG_PLATFORM__;
}

export function isPlatform(named: string): named is Platform {
	return PLATFORMS.some((platform) => platform === named);
}
