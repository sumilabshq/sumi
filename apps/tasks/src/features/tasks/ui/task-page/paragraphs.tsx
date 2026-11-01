import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";

export interface ParagraphsProps {
	readonly view: TaskView;
}

export function Paragraphs({ view }: ParagraphsProps): ReactElement[] {
	return paragraphsOf(view).map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

export function paragraphsOf(view: TaskView): readonly string[] {
	return view.description.split(/\n\s*\n/).filter((paragraph) => paragraph.trim() !== "");
}
