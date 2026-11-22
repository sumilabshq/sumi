import { createElement as h } from "react";
import type { ComponentType, ReactElement } from "react";
import type { McpAppViewProps } from "@sumi/mcp-apps-plugin";
import type { ShownViewSchema } from "@sumi/view-work/contract";
import type { ViewPart, ViewTemplate } from "@sumi/view-work/implementation";
import type { z } from "zod";
import { SavedView } from "../saved-view/saved-view.js";
import { ViewFrame } from "../view-frame/view-frame.js";

type ChatViewProps = McpAppViewProps<z.output<typeof ShownViewSchema>>;

const NO_BUILT_IN = "This built-in view is not in this version of Sumi.";

export function chatViewOf(
	parts: readonly ViewPart[],
	templates: readonly ViewTemplate[],
): ComponentType<ChatViewProps> {
	return function ChatView({ result }: ChatViewProps): ReactElement | null {
		if (result.path !== null) {
			return <SavedView path={result.path} id={result.id} title={result.title} parts={parts} />;
		}

		const template = templates.find(({ id }) => id === result.id);

		if (template === undefined) {
			return <p style={{ margin: 0, color: "var(--text-3)" }}>{NO_BUILT_IN}</p>;
		}

		return <ViewFrame id={template.id} title={template.title} html={template.html} parts={parts} />;
	};
}
