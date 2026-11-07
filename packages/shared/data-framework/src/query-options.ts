import type { QueryFunctionContext } from "@tanstack/react-query";
import { queryKeyOf } from "./query-key";
import type { Runtime } from "./runtime";
import { RequestFailed } from "./request-failed";
import type { AnyQuery } from "./request";

const RETRIES_OVER_NETWORK = 2;

const LOCAL_POLICY = {
	retry: false,
	refetchOnWindowFocus: false,
	refetchOnReconnect: false,
	networkMode: "always",
} as const;

const REMOTE_POLICY = {
	retry: retriesUnreachable,
	refetchOnWindowFocus: true,
	refetchOnReconnect: true,
	networkMode: "online",
} as const;

export function queryOptionsOf(runtime: Runtime, request: AnyQuery, sent: unknown) {
	const queryKey = queryKeyOf(request, sent);
	return {
		queryKey,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<unknown> => {
			const answer = await runtime.send(request, sent, { signal });
			if (!answer.ok) throw new RequestFailed(answer.reason, answer.code, queryKey);
			return answer.output;
		},
		staleTime: request.freshFor ?? 0,
		initialData: request.isSettledNow ? () => runtime.routes.readNow(request, sent)?.output : undefined,
		...(runtime.routes.isLocal(request) ? LOCAL_POLICY : REMOTE_POLICY),
	};
}

function retriesUnreachable(failures: number, failed: Error): boolean {
	return failures < RETRIES_OVER_NETWORK && failed instanceof RequestFailed && failed.code === "unreachable";
}
