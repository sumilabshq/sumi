import { useCallback } from "react";
import { useShownForAWhile } from "../shown-for-a-while/use-shown-for-a-while.js";

export type Answer = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export type Act<Input> = (input: Input) => Promise<Answer>;

export type Press = () => Promise<Answer>;

export interface Refusal {
	readonly refusal: string | null;
	readonly heard: (answer: Promise<Answer>) => void;
}

export function useRefusal(): Refusal {
	const [refusal, setRefusal] = useShownForAWhile();
	const heard = useCallback(
		(answer: Promise<Answer>) => void answer.then((one) => setRefusal(one.ok ? null : one.reason)),
		[setRefusal],
	);
	return { refusal, heard };
}
