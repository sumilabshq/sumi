import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Kbd } from "./kbd";

export interface QuestionnaireChoiceKeyProps {
	readonly shortcut: string | undefined;
}

export function QuestionnaireChoiceKey({ shortcut }: QuestionnaireChoiceKeyProps): ReactElement | null {
	if (!shortcut) return null;
	return (
		<Kbd className="wg-kit-quiz-choice-key" aria-hidden="true">
			{shortcut}
		</Kbd>
	);
}
