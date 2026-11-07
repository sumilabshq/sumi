export interface AppTabs {
	appOfTab(tab: string): Promise<string | null>;
}
