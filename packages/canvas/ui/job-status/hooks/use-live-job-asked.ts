import { useEffect } from "react";

export function useLiveJobAsked(job: string | null, ask: (input: { readonly id: string }) => void): void {
	useEffect(() => {
		if (job) ask({ id: job });
	}, [job, ask]);
}
