import { PageTitlesGateway } from "./page-titles.gateway.js";

export class ListedPageTitlesGateway extends PageTitlesGateway {
	constructor(private readonly titlesOf: ReadonlyMap<string, (address: string) => string>) {
		super();
	}

	override titleOf(app: string, address: string | null): string | null {
		const titleOf = this.titlesOf.get(app);
		return titleOf === undefined || address === null || address === "" ? null : titleOf(address);
	}
}
