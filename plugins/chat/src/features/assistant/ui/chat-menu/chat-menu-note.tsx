import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export function ChatMenuNote({ children }: { readonly children: ReactNode }): ReactElement {
	return <div className="wg-studio-ai-menu-label is-note">{children}</div>;
}
