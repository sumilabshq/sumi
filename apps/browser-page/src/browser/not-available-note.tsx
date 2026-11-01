import { createElement as h } from "react";
import type { ReactElement } from "react";

const NOT_AVAILABLE = "The browser isn't available here.";

export function NotAvailableNote({ reason }: { readonly reason: string }): ReactElement {
	return (
		<div className="wg-browser-note" role="alert">
			<p className="wg-browser-note-title">{NOT_AVAILABLE}</p>
			<p className="wg-browser-note-reason">{reason}</p>
		</div>
	);
}
