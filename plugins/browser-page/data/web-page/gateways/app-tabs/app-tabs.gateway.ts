export abstract class AppTabsGateway {
	abstract appOfTab(tab: string): Promise<string | null>;
}
