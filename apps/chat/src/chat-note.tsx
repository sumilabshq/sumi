import { createElement as h } from "react";
import type { ReactElement } from "react";

export function ChatNote({ said }: { readonly said: string }): ReactElement {
	return <p className="wg-chat-app-none">{said}</p>;
}
