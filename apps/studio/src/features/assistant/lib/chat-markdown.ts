import { createContext, useEffect, useState } from "react";
import type { AssistantPort, RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";

interface MarkdownRenderer {
	readonly render: RenderMarkdown | null;
}

const PLAIN_TEXT: MarkdownRenderer = {
	render: null,
};
const NOT_READ = "[widgetarium] the chat draws its answers as plain text: the assistant's setup was not read: {why}";

export const ChatMarkdownContext = createContext<RenderMarkdown | null>(null);

export function useMarkdownRendererOf(assistant: AssistantPort): RenderMarkdown | null {
	const [renderer, setRenderer] = useState<MarkdownRenderer>(PLAIN_TEXT);
	useEffect(() => {
		const read = (): void => {
			assistant.setup().then(
				({ renderMarkdown }) =>
					setRenderer({
						render: renderMarkdown,
					}),
				(failure: unknown) => {
					console.warn(NOT_READ.replace("{why}", String(failure)));
					setRenderer(PLAIN_TEXT);
				},
			);
		};
		read();
		return assistant.onSetup(read);
	}, [assistant]);
	return renderer.render;
}
