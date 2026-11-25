import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon, Button, copyText } from "@widgetarium/kit";

const COPIED = "Copied";

export interface CopyButtonProps {
	readonly label: string;
	readonly text: string;
}

export function CopyButton({ label, text }: CopyButtonProps): ReactElement {
	const [isCopied, setCopied] = useState(false);
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			className="wg-studio-ai-round is-button"
			label={isCopied ? COPIED : label}
			onClick={() => void copyText(text).then(setCopied)}
		>
			<Icon name={isCopied ? "tick" : "copy"} size={13} />
		</Button>
	);
}
