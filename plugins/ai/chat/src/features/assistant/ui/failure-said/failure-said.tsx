import { createElement as h } from "react";
import type { ReactElement } from "react";

export function FailureSaid({ failure }: { readonly failure: string | null }): ReactElement | null {
	if (failure === null) {
		return null;
	}

	return (
		<p className="wg-studio-ai-failure is-quiet" role="alert">
			{failure}
		</p>
	);
}
