import { useCallback, useEffect, useRef, useState } from "react";
import type { RefCallback } from "react";
import { OpenWebPageCommand, ReloadWebPageCommand, WebPageQuery } from "@sumi/contract";
import type { WebPage } from "@sumi/contract";
import type { Answer } from "@widgetarium/data-framework";
import { useApp, useOptionalQuery } from "@widgetarium/data-framework";
import { usePlacesArea } from "./use-places-area.js";

interface WebPageControls {
	readonly page: WebPage;
	readonly failure: string | null;
	readonly areaRef: RefCallback<HTMLDivElement>;
	readonly reload: () => void;
}

interface AddressOpening {
	readonly tabId: string;
	readonly address: string;
	readonly heldPage: WebPage | null | undefined;
	readonly showRefusal: (answer: Answer<unknown>) => void;
}

export function useWebPage(tabId: string, address: string, onNavigated: (url: string) => void): WebPageControls {
	const shell = useApp("useWebPage");
	const read = useOptionalQuery(WebPageQuery, { tab: tabId });
	const heldPage = read.isLoading ? undefined : read.data;
	const [refusal, showRefusal] = useRefusal();
	useOpensAddress({ tabId, address, heldPage, showRefusal });
	useReportsUrl(heldPage?.url ?? null, address, onNavigated);
	return {
		page: heldPage ?? waitingFor(address),
		failure: read.failure ?? refusal,
		areaRef: usePlacesArea(tabId, heldPage !== null && heldPage !== undefined),
		reload: () => void shell.send(ReloadWebPageCommand, { tab: tabId }).then(showRefusal),
	};
}

function useRefusal(): [string | null, (answer: Answer<unknown>) => void] {
	const [refusal, setRefusal] = useState<string | null>(null);
	const showRefusal = useCallback((answer: Answer<unknown>): void => setRefusal(answer.ok ? null : answer.reason), []);
	return [refusal, showRefusal];
}

function useOpensAddress({ tabId, address, heldPage, showRefusal }: AddressOpening): void {
	const shell = useApp("useOpensAddress");
	const shownUrl = useRef<string | null>(null);
	shownUrl.current = heldPage?.url ?? null;
	const isRead = heldPage !== undefined;
	useEffect(() => {
		if (!isRead || shownUrl.current === address) {
			return;
		}

		void shell.send(OpenWebPageCommand, { tab: tabId, url: address }).then(showRefusal);
	}, [shell, tabId, address, isRead, showRefusal]);
}

function useReportsUrl(url: string | null, address: string, onNavigated: (url: string) => void): void {
	const asked = useRef(address);
	asked.current = address;
	useEffect(() => {
		if (url === null || url === asked.current) {
			return;
		}

		onNavigated(url);
	}, [url, onNavigated]);
}

function waitingFor(url: string): WebPage {
	return {
		url,
		title: "",
		isLoading: true,
		canGoBack: false,
		canGoForward: false,
	};
}
