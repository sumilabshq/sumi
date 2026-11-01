import { useCallback, useEffect, useRef, useState } from "react";
import type { RefCallback } from "react";
import type { PageArea, WebPage } from "@sumi/contract";
import type { SumiWebPage } from "../sumi-web-page.js";

export interface WebPageControls {
	readonly shown: WebPage;
	readonly failure: string | null;
	readonly area: RefCallback<HTMLDivElement>;
	readonly reload: () => void;
}

interface HeldPage {
	readonly page: WebPage | null | undefined;
	readonly failure: string | null;
	readonly fail: (thrown: unknown) => void;
}

const PAGE_AREA_MAX_PX = 16_384;

export function useWebPage(page: SumiWebPage, address: string, onUrl: (url: string) => void): WebPageControls {
	const held = useHeldPage(page);
	const hasPage = held.page !== null && held.page !== undefined;
	useOpensAddress(page, address, held);
	useTellsUrl(held.page?.url ?? null, address, onUrl);
	return {
		shown: held.page ?? waitingFor(address),
		failure: held.failure,
		area: usePlacesArea(page, hasPage),
		reload: () => void page.reload().catch(held.fail),
	};
}

function useHeldPage(page: SumiWebPage): HeldPage {
	const [held, setHeld] = useState<WebPage | null | undefined>(undefined);
	const [failure, setFailure] = useState<string | null>(null);
	const fail = useCallback((thrown: unknown): void => setFailure(reasonOf(thrown)), []);
	useEffect(() => {
		const reread = (): void => {
			page.read().then((read) => {
				setHeld(read);
				setFailure(null);
			}, fail);
		};
		reread();
		return page.changes(reread);
	}, [page, fail]);
	return {
		page: held,
		failure,
		fail,
	};
}

function useOpensAddress(page: SumiWebPage, address: string, held: HeldPage): void {
	const shownUrl = useRef<string | null>(null);
	shownUrl.current = held.page?.url ?? null;
	const isRead = held.page !== undefined;
	const { fail } = held;
	useEffect(() => {
		if (!isRead || shownUrl.current === address) {
			return;
		}

		page.open(address).catch(fail);
	}, [page, address, isRead, fail]);
}

function useTellsUrl(url: string | null, address: string, onUrl: (url: string) => void): void {
	const asked = useRef(address);
	asked.current = address;
	useEffect(() => {
		if (url === null || url === asked.current) {
			return;
		}

		onUrl(url);
	}, [url, onUrl]);
}

function usePlacesArea(page: SumiWebPage, hasPage: boolean): RefCallback<HTMLDivElement> {
	const element = useRef<HTMLDivElement | null>(null);
	const placed = useRef<string | null>(null);
	const isPlaceable = useRef(hasPage);
	isPlaceable.current = hasPage;
	const place = useCallback((): void => {
		const at = element.current;

		if (at === null || !isPlaceable.current) {
			return;
		}

		const area = areaOf(at);
		const key = JSON.stringify(area);

		if (key === placed.current) {
			return;
		}

		placed.current = key;
		page.place(area).catch(reportRefused);
	}, [page]);
	useEffect(() => {
		placed.current = null;
		place();
	}, [hasPage, place]);
	return useCallback(
		(at: HTMLDivElement | null): (() => void) | undefined => {
			if (at === null) {
				return undefined;
			}

			element.current = at;
			const observed = new ResizeObserver(place);
			observed.observe(at);
			observed.observe(at.ownerDocument.documentElement);
			place();
			return () => {
				observed.disconnect();
				element.current = null;
				placed.current = null;

				if (isPlaceable.current) {
					page.place(null).catch(reportRefused);
				}
			};
		},
		[page, place],
	);
}

function areaOf(element: HTMLElement): PageArea {
	const { x, y, width, height } = element.getBoundingClientRect();
	return {
		x: pxOf(x),
		y: pxOf(y),
		width: pxOf(width),
		height: pxOf(height),
	};
}

function pxOf(measured: number): number {
	return Math.min(Math.max(Math.round(measured), 0), PAGE_AREA_MAX_PX);
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

function reportRefused(thrown: unknown): void {
	console.error(`[sumi-browser-page] the page area was not placed: ${reasonOf(thrown)}`);
}

function reasonOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}
