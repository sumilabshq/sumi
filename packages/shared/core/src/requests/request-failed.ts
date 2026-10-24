import type { QueryKey } from "@tanstack/react-query";
import type { RefusalCode } from "./answer";

export class RequestFailed extends Error {
	constructor(
		readonly reason: string,
		readonly code: RefusalCode,
		readonly queryKey: QueryKey,
	) {
		super(reason);
		this.name = "RequestFailed";
	}
}
