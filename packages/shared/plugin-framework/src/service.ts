import { checkedName } from "./identity";

export class Service<Api> {
	declare readonly api: Api;

	constructor(readonly id: string) {}
}

export function service<Api>(id: string): Service<Api> {
	return new Service<Api>(checkedName(id));
}
