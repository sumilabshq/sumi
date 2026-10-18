import { useEffect } from "react";
import type { RefObject } from "react";

export function useFocusesWhen(composerBox: RefObject<HTMLTextAreaElement | null>, label: string | null): void {
	useEffect(() => {
		if (label) composerBox.current?.focus();
	}, [composerBox, label]);
}
