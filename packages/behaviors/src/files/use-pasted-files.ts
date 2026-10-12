import { useEffect, useRef } from "react";
import { filesOfType } from "./files-of.js";

export function usePastedFiles(typePrefix: string, onFiles: (files: File[]) => void): void {
	const latest = useRef(onFiles);
	latest.current = onFiles;
	useEffect(() => {
		const onPaste = (event: ClipboardEvent): void => {
			const files = filesOfType(event.clipboardData?.files, typePrefix);
			if (files.length > 0) latest.current(files);
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, [typePrefix]);
}
