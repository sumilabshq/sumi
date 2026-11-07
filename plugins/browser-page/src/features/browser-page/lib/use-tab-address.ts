import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AppTabQuery } from "@sumi/contract";
import { useApp, useOptionalQuery } from "@widgetarium/data-framework";
import { NEW_TAB_ADDRESS } from "./new-tab-address.js";
import { recordTabPage } from "../../../shared/lib/record-tab-page.js";

export interface TabAddress {
	readonly address: string | null;
	readonly failure: string | null;
	readonly navigate: (address: string) => void;
}

export function useTabAddress(tabId: string): TabAddress {
	const read = useOptionalQuery(AppTabQuery, { id: tabId });
	const [address, setAddress] = useState<string | null>(null);
	useFollowsStoredAddress(read.data === null ? null : (read.data.address ?? NEW_TAB_ADDRESS), setAddress);
	return {
		address,
		failure: read.failure,
		navigate: useNavigates(tabId, setAddress),
	};
}

function useFollowsStoredAddress(stored: string | null, setAddress: Dispatch<SetStateAction<string | null>>): void {
	useEffect(() => {
		if (stored === null) {
			return;
		}

		setAddress(stored);
	}, [stored, setAddress]);
}

function useNavigates(tabId: string, setAddress: (address: string) => void): (address: string) => void {
	const shell = useApp("useNavigates");
	return useCallback(
		(nextAddress: string): void => {
			setAddress(nextAddress);
			recordTabPage(shell, tabId, { address: nextAddress, how: "push" });
		},
		[shell, tabId, setAddress],
	);
}
