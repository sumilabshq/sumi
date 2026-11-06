import { useState } from "react";
import { useCommand } from "@widgetarium/framework";
import { RenameRowCommand } from "@widgetarium/command-menu";
import type { Row } from "@widgetarium/command-menu";
import type { Toast } from "./use-menu-moves.js";

export interface RowRename {
	readonly key: string | null;
	readonly name: string;
	start(): void;
	type(name: string): void;
	save(): void;
	stop(): void;
}

interface Renaming {
	readonly key: string;
	readonly name: string;
}

export function useRowRename(picked: Row | null, setToast: (toast: Toast) => void): RowRename {
	const [renaming, setRenaming] = useState<Renaming | null>(null);
	const renameRow = useCommand(RenameRowCommand);
	return {
		key: renaming?.key ?? null,
		name: renaming?.name ?? "",
		start: () => {
			if (picked === null || picked.renames === null) {
				return;
			}

			setRenaming({ key: picked.key, name: picked.title });
		},
		type: (name) => setRenaming((was) => (was === null ? null : { ...was, name })),
		save: () => {
			const target = picked?.renames ?? null;
			setRenaming(null);

			if (renaming === null || target === null) {
				return;
			}

			void renameRow.run({ ...target, name: renaming.name }).then((answer) => {
				setToast(
					answer.ok ? { message: answer.output.said, isWarning: false } : { message: answer.reason, isWarning: true },
				);
			});
		},
		stop: () => setRenaming(null),
	};
}
