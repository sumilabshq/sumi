import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { MessageScrollerContent, MessageScrollerProvider, MessageScrollerViewport } from "@widgetarium/kit";
import { ToEndButton } from "../to-end-button/to-end-button.js";

const AT_END_WITHIN_PX = 32;

export function ChatScroll({ children }: { readonly children: ReactNode }): ReactElement {
	return (
		<MessageScrollerProvider autoScroll={true} defaultScrollPosition="end" scrollEdgeThreshold={AT_END_WITHIN_PX}>
			<div className="wg-studio-ai-scroll-frame">
				<MessageScrollerViewport className="wg-studio-ai-scroll">
					<MessageScrollerContent className="wg-studio-ai-scroll-content">{children}</MessageScrollerContent>
				</MessageScrollerViewport>
				<ToEndButton />
			</div>
		</MessageScrollerProvider>
	);
}
