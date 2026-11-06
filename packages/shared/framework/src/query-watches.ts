import type { QueryClient } from "@tanstack/react-query";
import { SharedSubscriptions } from "./shared-subscriptions";
import { queryKeyOf } from "./query-key";
import type { AnyQuery } from "./request";
import { NOT_WATCHED } from "./route-queries";
import type { RouteQueries } from "./route-queries";

export class QueryWatches {
	private readonly subscriptions = new SharedSubscriptions();

	constructor(
		private readonly queryClient: QueryClient,
		private readonly routes: RouteQueries,
	) {}

	watch(request: AnyQuery, sent: unknown): () => void {
		const queryKey = queryKeyOf(request, sent);
		const reRead = (): void => void this.queryClient.invalidateQueries({ queryKey, exact: true });
		return this.subscriptions.join(JSON.stringify(queryKey), () => this.started(request, sent, reRead), NOT_WATCHED);
	}

	private started(request: AnyQuery, sent: unknown, reRead: () => void): () => void {
		const stop = this.routes.watchWhileShown(request, sent, reRead);
		if (stop !== NOT_WATCHED) reRead();
		return stop;
	}
}
