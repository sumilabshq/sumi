import { useEffect } from "react";
import { stableKey } from "../gateway/stable-key";
import type { StartedApp } from "./app";
import type { AnyQuery } from "./request";

export function useWatchesWhileShown(started: StartedApp, request: AnyQuery, sent: unknown): void {
	const asked = stableKey(sent);
	useEffect(() => started.watches.watch(request, sent), [started, request, asked]);
}
