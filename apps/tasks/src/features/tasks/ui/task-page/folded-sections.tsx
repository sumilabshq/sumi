import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@widgetarium/kit";
import type { SectionKey, TaskSectionsProps } from "./task-sections.js";

export interface FoldedSectionsProps extends TaskSectionsProps {
	readonly openAtStart: readonly SectionKey[];
}

export function FoldedSections({ sections, openAtStart }: FoldedSectionsProps): ReactElement {
	return (
		<Accordion type="multiple" defaultValue={openAtStart} className="wg-tasks-folds" data-tasks-folds="">
			{sections.map((section) => (
				<AccordionItem key={section.key} value={section.key} data-tasks-section={section.key}>
					<AccordionTrigger>
						<span className="wg-tasks-fold-head">
							<span>{section.title}</span>
							<span
								className="wg-tasks-fold-said"
								data-tasks-fold-said=""
								data-passed={section.isPassed ? "" : undefined}
							>
								{section.foldSaid}
							</span>
						</span>
					</AccordionTrigger>
					<AccordionContent>{section.body}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
