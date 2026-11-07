export abstract class PageTitlesGateway {
	abstract titleOf(app: string, address: string | null): string | null;
}
