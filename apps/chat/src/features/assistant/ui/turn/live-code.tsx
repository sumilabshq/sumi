import { createElement as h } from "react";
import type { ReactElement } from "react";

export function LiveCode({ tail }: { readonly tail: string }): ReactElement {
	const bodyAt = tail.indexOf("\n");
	return (
		<div className="wg-studio-ai-codeblock is-live">
			<pre>
				<code>{bodyAt === -1 ? "" : tail.slice(bodyAt + 1)}</code>
			</pre>
		</div>
	);
}
