import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Switch } from "@widgetarium/kit";
import type { RegistryEntry } from "../../lib/registry-types.js";
import { PluginPreview } from "../plugin-preview/plugin-preview.js";

export interface PluginCardProps {
	readonly entry: RegistryEntry;
	readonly onOpen: () => void;
	readonly onSwitch: (enabled: boolean) => void;
}

export function PluginCard({ entry, onOpen, onSwitch }: PluginCardProps): ReactElement | null {
	const { metadata } = entry;

	if (metadata === null) {
		return null;
	}

	return (
		<article className="sumi-plugins-card" data-off={entry.enabled ? undefined : ""}>
			<button type="button" className="sumi-plugins-card-open" aria-label={metadata.title} onClick={onOpen} />
			<span className="sumi-plugins-card-glow" />
			<span className="sumi-plugins-card-art">
				<PluginPreview />
			</span>
			<span className="sumi-plugins-card-shade" />
			<div className="sumi-plugins-card-info">
				<div className="sumi-plugins-card-words">
					<div className="sumi-plugins-card-head">
						<span>{metadata.title}</span>
						{metadata.official ? (
							<span className="sumi-plugins-badge" title="Made by Sumi">
								<Icon name="tick" size={9} />
							</span>
						) : null}
					</div>
					<div className="sumi-plugins-card-text">{metadata.description}</div>
				</div>
				<Switch
					tone="mono"
					size="small"
					checked={entry.enabled}
					onCheckedChange={onSwitch}
					label={`${metadata.title} enabled`}
				/>
			</div>
		</article>
	);
}
