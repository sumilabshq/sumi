import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { AttachmentChip } from "@widgetarium/assistant/contract";
import { sizeSaid } from "../../lib/size-said.js";
import type { Across } from "../../lib/use-overflows-across.js";

export interface AttachmentsHeadProps {
	readonly drafts: readonly AttachmentChip[];
	readonly across: Across;
}

const COUNT = "{count} files · {size}";
const ONE = "1 file · {size}";
const BACK = "Show earlier files";
const ON = "Show more files";
const NAV_PX = 14;

export function AttachmentsHead({ drafts, across }: AttachmentsHeadProps): ReactElement {
	const size = sizeSaid(drafts.reduce((sum, chip) => sum + chip.bytes, 0));
	const isScrolling = across.isMoreBefore || across.isMoreAfter;
	return (
		<div className="wg-studio-ai-attachments-head">
			<span>
				{drafts.length === 1
					? ONE.replace("{size}", size)
					: COUNT.replace("{count}", String(drafts.length)).replace("{size}", size)}
			</span>
			{isScrolling ? (
				<span className="wg-studio-ai-attachments-nav">
					<Button
						shape="square"
						emphasis="ghost"
						size="2xs"
						label={BACK}
						disabled={!across.isMoreBefore}
						onClick={across.pageBack}
					>
						<Icon name="chevron-left" size={NAV_PX} />
					</Button>
					<Button
						shape="square"
						emphasis="ghost"
						size="2xs"
						label={ON}
						disabled={!across.isMoreAfter}
						onClick={across.pageOn}
					>
						<Icon name="chevron-right" size={NAV_PX} />
					</Button>
				</span>
			) : null}
		</div>
	);
}
