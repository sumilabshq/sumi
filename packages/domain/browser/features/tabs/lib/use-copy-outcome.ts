import { useEffect, useState } from "react";

export type CopyOutcome = "idle" | "copied" | "failed";

export interface CopyAction {
	readonly outcome: CopyOutcome;
	readonly copy: () => void;
}

interface CopyPress {
	readonly outcome: CopyOutcome;
	readonly count: number;
}

const OUTCOME_SHOWN_MS = 1500;
const UNPRESSED: CopyPress = {
	outcome: "idle",
	count: 0,
};

export function useCopyOutcome(text: string): CopyAction {
	const [press, setPress] = useState<CopyPress>(UNPRESSED);
	useEffect(() => {
		if (press.outcome === "idle") {
			return undefined;
		}

		const timer = setTimeout(() => setPress(UNPRESSED), OUTCOME_SHOWN_MS);
		return () => clearTimeout(timer);
	}, [press]);
	return {
		outcome: press.outcome,
		copy: () =>
			void copyToClipboard(text).then((outcome) =>
				setPress({
					outcome,
					count: press.count + 1,
				}),
			),
	};
}

async function copyToClipboard(text: string): Promise<CopyOutcome> {
	try {
		await navigator.clipboard.writeText(text);
		return "copied";
	} catch (failure) {
		console.error("[widgetarium] the browser could not copy text", failure);
		return "failed";
	}
}
