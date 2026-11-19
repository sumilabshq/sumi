import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artboards } from "@sumi/artboards/contract";
import type { CanvasOrder, CanvasRow } from "@sumi/artboards/contract";
import { useQuery, useRuntime } from "@widgetarium/data-framework";
import type { IndexSpan } from "./grid-span.js";

export interface PagedCanvases {
	readonly total: number;
	readonly rowAt: (index: number) => CanvasRow | undefined;
	readonly want: (span: IndexSpan) => void;
}

interface HeldPages {
	readonly key: string;
	readonly pages: ReadonlyMap<number, readonly CanvasRow[]>;
}

const PAGE_SIZE = 48;
const NO_PAGES: ReadonlyMap<number, readonly CanvasRow[]> = new Map();
const PAGE_REFUSED = "[canvas] canvases {from}–{to} stay unread: {reason}";

export function usePagedCanvases(order: CanvasOrder, words: string): PagedCanvases {
	const runtime = useRuntime("usePagedCanvases");
	const first = useQuery(artboards.canvases.getCanvasesPage, {
		offset: 0,
		limit: PAGE_SIZE,
		order,
		words,
	}).data;
	const key = `${order}\n${words}`;
	const [held, setHeld] = useState<HeldPages>({
		key,
		pages: NO_PAGES,
	});
	const asked = useRef(new Set<number>());
	const lastWanted = useRef<IndexSpan | null>(null);
	const currentKey = useRef(key);
	currentKey.current = key;
	const pages = held.key === key ? held.pages : NO_PAGES;

	const want = useCallback(
		(span: IndexSpan): void => {
			lastWanted.current = span;

			for (const page of laterPagesOf(span).filter((one) => !asked.current.has(one))) {
				asked.current.add(page);
				void runtime
					.send(artboards.canvases.getCanvasesPage, {
						offset: page * PAGE_SIZE,
						limit: PAGE_SIZE,
						order,
						words,
					})
					.then((answer) => {
						if (!answer.ok) {
							asked.current.delete(page);
							console.error(
								PAGE_REFUSED.replace("{from}", `${page * PAGE_SIZE}`)
									.replace("{to}", `${(page + 1) * PAGE_SIZE}`)
									.replace("{reason}", answer.reason),
							);
							return;
						}

						if (currentKey.current !== key) {
							return;
						}

						setHeld((was) => ({
							key,
							pages: new Map(was.key === key ? was.pages : NO_PAGES).set(page, answer.output.rows),
						}));
					});
			}
		},
		[runtime, order, words, key],
	);

	useEffect(() => {
		asked.current = new Set();

		if (lastWanted.current !== null) {
			want(lastWanted.current);
		}
	}, [first, want]);

	return useMemo(
		() => ({
			total: first.total,
			rowAt: (index: number) => rowAtOf(index, first.rows, pages),
			want,
		}),
		[first, pages, want],
	);
}

function laterPagesOf({ first, last }: IndexSpan): number[] {
	const from = Math.max(1, Math.floor(first / PAGE_SIZE));
	const to = Math.floor(Math.max(0, last - 1) / PAGE_SIZE);
	return Array.from({ length: Math.max(0, to - from + 1) }, (_, at) => from + at);
}

function rowAtOf(
	index: number,
	firstRows: readonly CanvasRow[],
	pages: ReadonlyMap<number, readonly CanvasRow[]>,
): CanvasRow | undefined {
	const page = Math.floor(index / PAGE_SIZE);
	const rows = page === 0 ? firstRows : pages.get(page);
	return rows?.[index - page * PAGE_SIZE];
}
