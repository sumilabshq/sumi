import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon, copyText } from "@widgetarium/kit";

const COPIED = "Copied";

export interface CopyButtonProps {
	readonly label: string;
	readonly text: string;
}

export function CopyButton({ label, text }: CopyButtonProps): ReactElement {
	const [isCopied, setCopied] = useState(false);
	return (
		<button
			className="wg-studio-ai-round is-button"
			type="button"
			aria-label={isCopied ? COPIED : label}
			onClick={() => void copyText(text).then(setCopied)}
		>
			<Icon name={isCopied ? "tick" : "copy"} size={13} />
		</button>
	);
}
