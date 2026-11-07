import { PageTabGateway } from "./page-tab.gateway.js";

export class GivenPageTabGateway extends PageTabGateway {
	constructor(private readonly given: string) {
		super();
	}

	override tabId(): string {
		return this.given;
	}
}
