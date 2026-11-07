export const SUMI_APPS_WORKSPACE = "sumi-apps";
export const SUMI_CHAT_TAB = "c1";
export const SUMI_PAGE_APPS = ["tasks", "terminal", "browser-page"] as const;
export const SUMI_APP_IDS = [...SUMI_PAGE_APPS, "chat"] as const;
export const SUMI_VIEW_APPS: readonly string[] = ["terminal", "browser-page"];

export function sumiTabOf(app: string): string {
	return `t-${app}`;
}

export type SumiAppId = (typeof SUMI_APP_IDS)[number];
