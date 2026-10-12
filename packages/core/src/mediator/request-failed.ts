export class RequestFailed extends Error {
	constructor(
		readonly reason: string,
		readonly key: string | null = null,
	) {
		super(reason);
		this.name = "RequestFailed";
	}
}
