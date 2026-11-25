import { createElement as h, useState } from "react";
import type { ComponentType, ReactElement } from "react";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { SettingsDetailContext } from "../../../../shared/lib/settings-detail-context.js";
import type { SettingsDetail } from "../../../../shared/lib/settings-detail-context.js";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";
import { SettingsTabContext } from "../../../../shared/lib/settings-tab-context.js";
import { pagesByGroup } from "../../lib/pages-by-group.js";
import { SettingsNav } from "../settings-nav/settings-nav.js";
import { SettingsTrail } from "../settings-trail/settings-trail.js";

export function settingsPageOf(pages: readonly SettingsPage[]): ComponentType<TabPageProps> {
	return function SettingsRoot({ tabId }: TabPageProps): ReactElement {
		const groups = pagesByGroup(pages);
		const first = groups[0]?.pages[0];
		const [pickedId, setPickedId] = useState<string | null>(null);
		const [detail, setDetail] = useState<SettingsDetail | null>(null);
		const shown = pages.find((page) => page.id === pickedId) ?? first;

		if (shown === undefined) {
			return <div className="sumi-settings" />;
		}

		const View = shown.view;
		const show = (page: SettingsPage): void => setPickedId(page.id);
		return (
			<div className="sumi-settings" data-detail={detail === null ? undefined : ""}>
				<div className="sumi-settings-row">
					<SettingsNav groups={groups} shown={shown} onShow={show} />
					<div className="sumi-settings-main">
						<div className="sumi-settings-body">
							<SettingsTrail pages={pages} shown={shown} detail={detail} onShow={show} />
							<SettingsTabContext.Provider value={tabId}>
								<SettingsDetailContext.Provider value={setDetail}>
									<View />
								</SettingsDetailContext.Provider>
							</SettingsTabContext.Provider>
						</div>
					</div>
				</div>
			</div>
		);
	};
}
