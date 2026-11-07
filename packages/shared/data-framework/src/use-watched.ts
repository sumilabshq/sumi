import { useEffect } from "react";
import { stableKey } from "./gateway/stable-key";
import type { Runtime } from "./runtime";
import type { AnyQuery } from "./request";

export function useWatchesWhileShown(started: Runtime, request: AnyQuery, sent: unknown): void {
	const asked = stableKey(sent);
	useEffect(() => started.watches.watch(request, sent), [started, request, asked]);
}
