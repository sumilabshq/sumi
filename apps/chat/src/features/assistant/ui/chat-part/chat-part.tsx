import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";

const LEFT_OUT = (): null => null;

// TRADE-OFF: a failed optional part is left out silently; only the setup failure reaches the line above the composer.
export function ChatPart({ children }: { readonly children: ReactNode }): ReactElement {
	return (
		<Slot loading={null} error={LEFT_OUT}>
			{children}
		</Slot>
	);
}
