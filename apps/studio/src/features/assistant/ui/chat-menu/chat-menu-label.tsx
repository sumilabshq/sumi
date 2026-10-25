import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export function ChatMenuLabel({ children }: { readonly children: ReactNode }): ReactElement {
	return <div className="wg-studio-ai-menu-label">{children}</div>;
}
