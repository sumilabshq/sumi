import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	useMessageScroller,
	useMessageScrollerVisibility,
} from "../packages/shared/kit/src/index";
import { Fold } from "./kit-chat-fold";

interface Row {
	readonly id: string;
	readonly height: number;
	readonly anchor: boolean;
	readonly paragraphs: number;
	readonly folds: boolean;
}

type RowAsk = Partial<Row> & { readonly id: string };

const OPENING_ROWS = 30;
const ROW_PX = 60;
const PROSE =
	"The reader keeps this line in view while the pane narrows, and every line above it wraps again into more lines.";

function rowOf({ id, height = ROW_PX, anchor = false, paragraphs = 0, folds = false }: RowAsk): Row {
	return {
		id,
		height,
		anchor,
		paragraphs,
		folds,
	};
}

function drawRow(row: Row): ReactElement {
	if (row.folds) {
		return <Fold id={row.id} />;
	}

	if (row.paragraphs === 0) {
		return <div style={{ height: row.height }}>{row.id}</div>;
	}

	return (
		<div>
			{Array.from({ length: row.paragraphs }, (_, at) => (
				<p key={at} data-paragraph={at}>
					{PROSE}
				</p>
			))}
		</div>
	);
}

function Chat(): ReactElement {
	const [rows, setRows] = useState<readonly Row[]>(() =>
		Array.from({ length: OPENING_ROWS }, (_, at) => rowOf({ id: `r${at}` })),
	);
	const change = (next: (was: readonly Row[]) => readonly Row[]): void => flushSync(() => setRows(next));
	Object.assign(window, {
		chat: {
			append: (ask: RowAsk) => change((was) => [...was, rowOf(ask)]),
			prepend: (count: number) =>
				change((was) => [...Array.from({ length: count }, (_, at) => rowOf({ id: `old${was.length}-${at}` })), ...was]),
			insertAfter: (after: string, ask: RowAsk) =>
				change((was) => was.flatMap((row) => (row.id === after ? [row, rowOf(ask)] : [row]))),
			grow: (id: string, by: number) =>
				change((was) => was.map((row) => (row.id === id ? { ...row, height: row.height + by } : row))),
		},
	});
	return (
		<MessageScrollerProvider autoScroll>
			<MessageScroller>
				<MessageScrollerViewport>
					<MessageScrollerContent>
						{rows.map((row) => (
							<MessageScrollerItem key={row.id} messageId={row.id} scrollAnchor={row.anchor}>
								{drawRow(row)}
							</MessageScrollerItem>
						))}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
				<Reader />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}

function Reader(): null {
	Object.assign(window, { chatCommands: useMessageScroller(), chatSeen: useMessageScrollerVisibility() });
	return null;
}

const host = document.getElementById("host");
if (!host) throw new Error("kit chat page: no #host");
createRoot(host).render(<Chat />);
