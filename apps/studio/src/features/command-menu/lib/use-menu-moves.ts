import { useState } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { DoRowCommand } from "@widgetarium/command-menu";
import type { Intent, Results, Row } from "@widgetarium/command-menu";
import { useAskInk } from "./ask-ink-context.js";
import { useRowRename } from "./use-row-rename.js";
import type { RowRename } from "./use-row-rename.js";

export interface MenuMoves {
	readonly pickedAt: number;
	readonly picked: Row | null;
	readonly hasActions: boolean;
	readonly isActing: boolean;
	readonly toast: string;
	readonly isWarning: boolean;
	readonly rename: RowRename;
	step(by: number): void;
	pickAt(at: number): void;
	typed(change: () => void): void;
	run(intent: Intent): void;
	setActing(isActing: boolean): void;
}

export interface Toast {
	readonly message: string;
	readonly isWarning: boolean;
}

export function useMenuMoves(results: Results): MenuMoves {
	const [pickedAt, setPickedAt] = useState(0);
	const [isActing, setActing] = useState(false);
	const [toast, setToast] = useState<Toast>({ message: "", isWarning: false });
	const doRow = useCommand(DoRowCommand);
	// TRADE-OFF: the assistant runs in its own app, so the view hands the text over once the chat is made
	const askInk = useAskInk();
	const rows = results.sections.flatMap((section) => section.rows);
	const at = rows.length === 0 ? 0 : Math.min(pickedAt, rows.length - 1);
	const picked = rows[at] ?? null;
	const rename = useRowRename(picked, setToast);
	return {
		pickedAt: at,
		picked,
		hasActions: (picked?.actions.length ?? 0) > 0,
		isActing,
		toast: toast.message,
		isWarning: toast.isWarning,
		rename: {
			...rename,
			start: () => {
				setActing(false);
				rename.start();
			},
		},
		step: (by) => {
			setActing(false);
			setPickedAt(rows.length === 0 ? 0 : (at + by + rows.length) % rows.length);
		},
		pickAt: (next) => setPickedAt(next),
		typed: (change) => {
			setPickedAt(0);
			setActing(false);
			setToast({ message: "", isWarning: false });
			change();
		},
		run: (intent) => {
			setActing(false);
			void doRow.run({ intent }).then((answer) => {
				if (!answer.ok) {
					setToast({ message: answer.reason, isWarning: true });
					return;
				}

				if (intent.do === "ask-ink") {
					askInk(intent.text);
				}

				if (answer.output.isMenuKept) {
					setToast({ message: answer.output.said, isWarning: false });
				}
			});
		},
		setActing,
	};
}
