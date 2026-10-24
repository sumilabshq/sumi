import { createElement as h } from "react";
import type { ReactElement } from "react";
import { QuietAction } from "../../../../shared/ui/page-state/quiet-action.js";
import type { QuietTone } from "../../../../shared/ui/page-state/quiet-action.js";
import { useCopyOutcome } from "../../lib/use-copy-outcome.js";
import type { CopyOutcome } from "../../lib/use-copy-outcome.js";

export interface CopyLinkActionProps {
	readonly address: string;
}

interface CopyLook {
	readonly icon: string;
	readonly label: string;
	readonly tone: QuietTone;
}

const LOOK_OF_OUTCOME: Readonly<Record<CopyOutcome, CopyLook>> = {
	idle: {
		icon: "link",
		label: "Copy link",
		tone: "ink",
	},
	copied: {
		icon: "check",
		label: "Copied",
		tone: "success",
	},
	failed: {
		icon: "x",
		label: "Couldn't copy",
		tone: "error",
	},
};

export function CopyLinkAction({ address }: CopyLinkActionProps): ReactElement {
	const { outcome, copy } = useCopyOutcome(address);
	return <QuietAction {...LOOK_OF_OUTCOME[outcome]} onPress={copy} />;
}
