import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ServedApp } from "@sumi/contract";
import { onThemeChanged } from "./theme-now.js";

export interface HostFacts {
	readonly address: string;
	readonly isShown: boolean;
}

type Served = RefObject<ServedApp | null>;

export function useHostEvents(served: Served, { address, isShown }: HostFacts): RefObject<string> {
	const reported = useRef(address);

	useEffect(() => sendShownAddress(served, reported, address), [address, served]);
	useEffect(() => sendVisibility(served, isShown), [isShown, served]);
	useEffect(() => followTheme(served), [served]);

	return reported;
}

function sendShownAddress(served: Served, reported: RefObject<string>, address: string): void {
	if (address === reported.current) {
		return;
	}

	reported.current = address;
	served.current?.send({
		type: "show",
		address,
	});
}

function sendVisibility(served: Served, isShown: boolean): void {
	served.current?.send({
		type: "visibility",
		isShown,
	});
}

function followTheme(served: Served): () => void {
	return onThemeChanged((theme) =>
		served.current?.send({
			type: "theme",
			theme,
		}),
	);
}
