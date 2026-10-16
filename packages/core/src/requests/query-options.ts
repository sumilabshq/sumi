import type { QueryFunctionContext } from "@tanstack/react-query";
import { queryKeyOf } from "./app";
import type { StartedApp } from "./app";
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

export function queryOptionsOf(started: StartedApp, request: AnyQuery, sent: unknown) {
	const queryKey = queryKeyOf(request, sent);
	return {
		queryKey,
		queryFn: async ({ signal }: QueryFunctionContext): Promise<unknown> => {
			const answer = await started.send(request, sent, { signal });
			if (!answer.ok) throw new RequestFailed(answer.reason, answer.code, queryKey);
			return answer.output;
		},
		staleTime: request.freshFor ?? 0,
		initialData: request.isSettledNow ? () => started.readNow(request, sent)?.output : undefined,
		...(started.isLocal(request) ? LOCAL_POLICY : REMOTE_POLICY),
	};
}

function retriesUnreachable(failures: number, failed: Error): boolean {
	return failures < RETRIES_OVER_NETWORK && failed instanceof RequestFailed && failed.code === "unreachable";
}
