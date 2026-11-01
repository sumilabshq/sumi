import { useCallback, useEffect, useState } from "react";
import type { SumiTab, TabPage } from "../sumi-tab.js";

export interface TabAddress {
	readonly address: string | null;
	readonly failure: string | null;
	readonly navigate: (address: string) => void;
}

export function useTabAddress(tab: SumiTab): TabAddress {
	const [address, setAddress] = useState<string | null>(null);
	const [failure, setFailure] = useState<string | null>(null);
	useEffect(() => {
		const reread = (): void => {
			tab.address().then(setAddress, (thrown: unknown) => setFailure(reasonOf(thrown)));
		};
		reread();
		return tab.changes(reread);
	}, [tab]);
	const navigate = useCallback(
		(to: string): void => {
			setAddress(to);
			recordIn(tab, {
				address: to,
				how: "push",
			});
		},
		[tab],
	);
	return {
		address,
		failure,
		navigate,
	};
}

export function recordIn(tab: SumiTab, page: TabPage): void {
	tab.record(page).catch((thrown: unknown) => console.error(`[sumi-browser-page] ${reasonOf(thrown)}`));
}

function reasonOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}
