import { useCallback, useMemo, useState } from "react";

export interface RowRenaming {
	readonly id: string | null;
	readonly onRenamed: () => void;
}

export interface RowRenamings {
	readonly renaming: RowRenaming;
	readonly startRenaming: (id: string) => void;
}

export function useRowRenaming(): RowRenamings {
	const [id, startRenaming] = useState<string | null>(null);
	const onRenamed = useCallback(() => startRenaming(null), []);
	const renaming = useMemo(() => ({ id, onRenamed }), [id, onRenamed]);
	return { renaming, startRenaming };
}
