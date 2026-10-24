import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

const COPY = "Copy the answer";
const COPIED = "Copied";

export function CopyButton({ copy }: { readonly copy: () => Promise<void> }): ReactElement {
	const [isCopied, setCopied] = useState(false);
	return (
		<button
			className="wg-studio-ai-round is-button"
			type="button"
			aria-label={isCopied ? COPIED : COPY}
			onClick={() => void copy().then(() => setCopied(true))}
		>
			<Icon name={isCopied ? "tick" : "copy"} size={13} />
		</button>
	);
}
