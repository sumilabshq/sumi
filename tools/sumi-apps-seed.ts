export const SUMI_APPS_WORKSPACE = "sumi-apps";
export const SUMI_CHAT_TAB = "c1";
export const SUMI_PAGE_APPS = ["tasks", "terminal", "canvas", "browser-page"] as const;
export const SUMI_APP_IDS = [...SUMI_PAGE_APPS, "chat"] as const;

export function sumiTabOf(app: string): string {
	return `t-${app}`;
}
