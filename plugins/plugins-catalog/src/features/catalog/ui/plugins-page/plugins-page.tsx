import { createElement as h, useCallback, useState } from "react";
import type { ReactElement } from "react";
import { useSettingsDetail, useSettingsTab, useWindowApp } from "@sumi/settings-plugin";
import { Button, Heading, Icon } from "@widgetarium/kit";
import type { Runtime } from "@widgetarium/data-framework";
import { CloverGlyph } from "../../../../shared/ui/clover-glyph/clover-glyph.js";
import { useBuildsPlugin } from "../../lib/use-builds-plugin.js";
import { useRegistry } from "../../lib/use-registry.js";
import { OffConfirm } from "../off-confirm/off-confirm.js";
import { PluginCard } from "../plugin-card/plugin-card.js";
import { PluginDetail } from "../plugin-detail/plugin-detail.js";
import { RestartBanner } from "../restart-banner/restart-banner.js";

const FIRST_SHOWN = 6;

interface PendingOff {
	readonly id: string;
	readonly title: string;
	readonly alsoOff: readonly string[];
}

function Catalog({ windowApp }: { readonly windowApp: Runtime }): ReactElement {
	const view = useRegistry(windowApp);
	const build = useBuildsPlugin(windowApp, useSettingsTab());
	const [openId, setOpenId] = useState<string | null>(null);
	const [words, setWords] = useState("");
	const [isExpanded, setExpanded] = useState(false);
	const [pending, setPending] = useState<PendingOff | null>(null);
	const visible = (view.registry?.plugins ?? []).filter((entry) => !entry.alwaysOn && entry.metadata !== null);
	const opened = visible.find((entry) => entry.id === openId);
	const goBack = useCallback(() => setOpenId(null), []);
	useSettingsDetail(opened?.metadata?.title ?? null, goBack);
	const turn = async (id: string, title: string, enabled: boolean): Promise<void> => {
		const alsoOff = enabled ? [] : await view.planOf(id);

		if (alsoOff.length > 0) {
			setPending({ id, title, alsoOff });
			return;
		}

		await view.setEnabled(id, enabled);
	};
	const matching = visible.filter((entry) =>
		`${entry.metadata?.title ?? ""} ${entry.metadata?.description ?? ""}`.toLowerCase().includes(words.toLowerCase()),
	);
	const shown = isExpanded || words !== "" ? matching : matching.slice(0, FIRST_SHOWN);
	const hiddenCount = matching.length - shown.length;
	const banner = (
		<div className="sumi-plugins-notices">
			<RestartBanner isNeeded={view.registry?.restartNeeded ?? false} />
			{pending === null ? null : (
				<OffConfirm
					title={pending.title}
					alsoOff={pending.alsoOff}
					onCancel={() => setPending(null)}
					onConfirm={() => {
						void view.setEnabled(pending.id, false);
						setPending(null);
					}}
				/>
			)}
		</div>
	);

	if (opened !== undefined) {
		return (
			<div className="sumi-plugins">
				{banner}
				<PluginDetail
					entry={opened}
					onSwitch={(enabled) => void turn(opened.id, opened.metadata?.title ?? opened.id, enabled)}
				/>
			</div>
		);
	}

	return (
		<div className="sumi-plugins">
			<div className="sumi-plugins-column">
				{banner}
				<div className="sumi-plugins-top">
					<div>
						<Heading level={1}>Plugins</Heading>
						<p className="sumi-plugins-lede">
							Each plugin adds one feature to Sumi. Switch one off and it leaves everywhere it appeared.
						</p>
					</div>
					<div className="sumi-plugins-acts">
						<Button emphasis="ghost" tone="neutral" size="sm" onClick={build}>
							<CloverGlyph size={14} />
							Build
						</Button>
						<label className="sumi-plugins-search">
							<Icon name="search" size={14} />
							<input placeholder="Search plugins" value={words} onChange={(event) => setWords(event.target.value)} />
						</label>
					</div>
				</div>
				<div className="sumi-plugins-label">
					By Sumi<span>{visible.length}</span>
				</div>
				<div className="sumi-plugins-grid">
					{shown.map((entry) => (
						<PluginCard
							key={entry.id}
							entry={entry}
							onOpen={() => setOpenId(entry.id)}
							onSwitch={(enabled) => void turn(entry.id, entry.metadata?.title ?? entry.id, enabled)}
						/>
					))}
				</div>
				{hiddenCount > 0 ? (
					<button type="button" className="sumi-plugins-more" onClick={() => setExpanded(true)}>
						{`Show ${hiddenCount} more`}
					</button>
				) : null}
				<div className="sumi-plugins-build">
					<div>
						<h3>Build your own plugin</h3>
						<p>Tell Sumi what you need; it writes the plugin in a chat and switches it on.</p>
					</div>
					<Button emphasis="solid" tone="neutral" size="sm" onClick={build}>
						<CloverGlyph size={14} />
						Build with Sumi
					</Button>
				</div>
			</div>
		</div>
	);
}

export function PluginsPage(): ReactElement | null {
	const windowApp = useWindowApp();
	return windowApp === null ? null : <Catalog windowApp={windowApp} />;
}
