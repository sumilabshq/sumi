import { createElement as h } from "react";
import type { ReactElement } from "react";

export function PlainSaid({ text }: { readonly text: string }): ReactElement {
	return <div className="wg-studio-ai-said">{text}</div>;
}
