import { createElement as h, useState } from "react";
import type { ComponentType, ReactElement } from "react";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { SettingsDetailContext } from "../../../../shared/lib/settings-detail-context.js";
import type { SettingsDetail } from "../../../../shared/lib/settings-detail-context.js";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";
import { SettingsTabContext } from "../../../../shared/lib/settings-tab-context.js";
import { pagesByGroup } from "../../lib/pages-by-group.js";
import { SettingsNav } from "../settings-nav/settings-nav.js";

const TITLE = "Settings";

export function settingsPageOf(pages: readonly SettingsPage[]): ComponentType<TabPageProps> {
	return function SettingsRoot({ tabId }: TabPageProps): ReactElement {
		const groups = pagesByGroup(pages);
		const first = groups[0]?.pages[0];
		const [pickedId, setPickedId] = useState<string | null>(null);
		const [isMenuOpen, setMenuOpen] = useState(false);
		const [detail, setDetail] = useState<SettingsDetail | null>(null);
		const shown = pages.find((page) => page.id === pickedId) ?? first;

		if (shown === undefined) {
			return <div className="sumi-settings" />;
		}

		const View = shown.view;
		const show = (page: SettingsPage): void => {
			setPickedId(page.id);
			setMenuOpen(false);
		};
		const crumb = (
			<div className="sumi-settings-crumb">
				<span className="sumi-settings-crumb-trail">{TITLE}</span>
				<span className="sumi-settings-crumb-trail">/</span>
				{detail === null ? (
					<span className="sumi-settings-crumb-now">{shown.title}</span>
				) : (
					<button type="button" className="sumi-settings-crumb-back" onClick={detail.onBack}>
						{shown.title}
					</button>
				)}
				{detail === null ? null : <span className="sumi-settings-crumb-trail">/</span>}
				{detail === null ? null : <span className="sumi-settings-crumb-now">{detail.title}</span>}
				<button
					type="button"
					className="sumi-settings-crumb-button"
					aria-label="Pages"
					onClick={() => setMenuOpen(!isMenuOpen)}
				>
					<Icon name="chevron-down" size={14} />
				</button>
				{isMenuOpen ? (
					<div className="sumi-settings-crumb-menu">
						{pages.map((page) => (
							<PopoverItem
								key={page.id}
								className="sumi-settings-item"
								icon={<Icon name={page.icon} size={16} />}
								onClick={() => show(page)}
							>
								<span className="sumi-settings-item-text">{page.title}</span>
							</PopoverItem>
						))}
					</div>
				) : null}
			</div>
		);
		return (
			<div className="sumi-settings" data-detail={detail === null ? undefined : ""}>
				{crumb}
				<div className="sumi-settings-row">
					<div className="sumi-settings-left">
						<SettingsNav groups={groups} shown={shown} onShow={show} />
					</div>
					<div className="sumi-settings-main">
						<div className="sumi-settings-body wg-kit-scroll-fade">
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
