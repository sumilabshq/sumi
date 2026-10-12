export class RequestFailed extends Error {
	constructor(readonly reason: string) {
		super(reason);
		this.name = "RequestFailed";
	}
}
