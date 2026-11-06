import type { QueryKey } from "@tanstack/react-query";
import { stableKey } from "./gateway/stable-key";
import type { AnyRequest } from "./request";

export function queryKeyOf(request: AnyRequest, sent: unknown): QueryKey {
	return [request.name, stableKey(sent)];
}
