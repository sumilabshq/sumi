import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { ComposerTools } from "../../../assistant/ui/composer/composer-tools.js";
import { DraftAttachments } from "../../../assistant/ui/composer/draft-attachments.js";
import { ComposerOptions } from "../../../../shared/ui/composer-options/composer-options.js";

export function AskComposerBar(): ReactElement {
	return (
		<>
			<DraftAttachments />
			<div className="wg-studio-ai-field-bar">
				<ComposerTools />
				<ComposerOptions chat={null} surface="ask" isEmptyChat={false} />
			</div>
		</>
	);
}
