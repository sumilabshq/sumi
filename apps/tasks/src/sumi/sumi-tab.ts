import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppTabQuery, RecordAppPageCommand } from "@sumi/contract";
import type { SumiFrame } from "./sumi-frame.js";

const NO_TAB = "useSumiTab is used outside SumiTabContext";

export interface SumiTab {
	readonly tabId: string;
	readonly address: string | null;
	readonly open: (address: string) => void;
}

export const SumiTabContext = createContext<SumiTab | null>(null);

export function useSumiTab(): SumiTab {
	const tab = useContext(SumiTabContext);

	if (tab === null) {
		throw new Error(NO_TAB);
	}

	return tab;
}

export function useTabOf({ sumi, transport, tabId }: SumiFrame): SumiTab {
	const [address, setAddress] = useState<string | null>(null);

	useEffect(() => {
		const reread = (): void => {
			void sumi.send(AppTabQuery, { id: tabId }).then((tab) => {
				if (!tab.ok) {
					console.error(`[tasks] reading the tab ${tabId} was refused: ${tab.reason}`);
					return;
				}

				setAddress(tab.output.address ?? "");
			});
		};
		reread();
		return transport.changes(reread);
	}, [sumi, transport, tabId]);

	const open = useCallback(
		(next: string) => {
			setAddress(next);
			void sumi.send(RecordAppPageCommand, { id: tabId, address: next, how: "push" }).then((recorded) => {
				if (!recorded.ok) {
					console.error(`[tasks] recording the address ${next} was refused: ${recorded.reason}`);
				}
			});
		},
		[sumi, tabId],
	);

	return useMemo(() => ({ tabId, address, open }), [tabId, address, open]);
}
