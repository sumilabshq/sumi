import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Heading, Icon, Switch } from "@widgetarium/kit";
import type { RegistryEntry } from "../../lib/registry-types.js";
import { PluginPreview } from "../plugin-preview/plugin-preview.js";
import { PluginProperties } from "./plugin-properties.js";

export interface PluginDetailProps {
	readonly entry: RegistryEntry;
	readonly onSwitch: (enabled: boolean) => void;
}

export function PluginDetail({ entry, onSwitch }: PluginDetailProps): ReactElement | null {
	const [tab, setTab] = useState<"description" | "properties">("description");
	const { metadata } = entry;

	if (metadata === null) {
		return null;
	}

	const paragraphs = (metadata.readme ?? metadata.description).split(/\n\s*\n/);
	return (
		<div className="sumi-plugins-detail">
			<div className="sumi-plugins-hero">
				<span className="sumi-plugins-hero-glow" />
				<span className="sumi-plugins-hero-art">
					<PluginPreview isLarge />
				</span>
				<span className="sumi-plugins-hero-fade-x" />
				<span className="sumi-plugins-hero-fade-y" />
				<div className="sumi-plugins-identity">
					<div>
						<Heading level={1} className="sumi-plugins-title">
							{metadata.title}
							{metadata.official ? (
								<span className="sumi-plugins-badge is-large">
									<Icon name="tick" size={11} />
								</span>
							) : null}
						</Heading>
						<div className="sumi-plugins-detail-desc">{metadata.description}</div>
					</div>
					<span className="sumi-plugins-detail-switch">
						<span className="sumi-plugins-detail-switch-label">Enabled</span>
						<Switch
							tone="mono"
							checked={entry.enabled}
							onCheckedChange={onSwitch}
							label={`${metadata.title} enabled`}
						/>
					</span>
				</div>
			</div>
			<div className="sumi-plugins-wrap">
				<div className="sumi-plugins-tabs">
					<button type="button" aria-pressed={tab === "description"} onClick={() => setTab("description")}>
						Description
					</button>
					<button type="button" aria-pressed={tab === "properties"} onClick={() => setTab("properties")}>
						Properties
					</button>
				</div>
				<div className="sumi-plugins-columns" data-tab={tab}>
					<div className="sumi-plugins-readme">
						{paragraphs.map((paragraph) =>
							paragraph.startsWith("## ") ? (
								<h2 key={paragraph}>{paragraph.slice(3)}</h2>
							) : (
								<p key={paragraph}>{paragraph}</p>
							),
						)}
					</div>
					<PluginProperties entry={entry} />
				</div>
			</div>
		</div>
	);
}
