import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { RunnersShown } from "@widgetarium/assistant/contract";
import { ManageProvidersButton } from "./manage-providers-button.js";
import { PaneHead } from "./pane-head.js";
import { RunnerMark } from "./runner-mark.js";

export interface ProvidersPaneProps {
	readonly shown: RunnersShown;
	readonly shownRunner: string;
	readonly onBrowse: (id: string) => void;
	readonly onManage: () => void;
}

const PROVIDER = "Provider";

export function ProvidersPane({ shown, shownRunner, onBrowse, onManage }: ProvidersPaneProps): ReactElement {
	return (
		<div className="sumi-model-pane is-providers">
			<PaneHead title={PROVIDER} action={<ManageProvidersButton onManage={onManage} />} />
			<div className="sumi-pane-list">
				{shown.runners.map(({ id, label }) => {
					const isShown = id === shownRunner;
					return (
						<PopoverItem
							key={id}
							className="sumi-provider-row"
							aria-current={isShown}
							onClick={() => onBrowse(id)}
							onPointerEnter={() => onBrowse(id)}
							onFocus={() => onBrowse(id)}
						>
							<RunnerMark runner={id} />
							<span className="sumi-provider-label">{label}</span>
							{isShown ? <Icon name="chevron-right" size={14} /> : null}
						</PopoverItem>
					);
				})}
			</div>
		</div>
	);
}
