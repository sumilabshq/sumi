import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	Icon,
	Popover,
	PopoverContent,
	PopoverItem,
	PopoverTrigger,
} from "@widgetarium/kit";
import type { SettingsDetail } from "../../../../shared/lib/settings-detail-context.js";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";

const TITLE = "Settings";
const PAGES = "Pages";
const ICON_PX = 14;

export interface SettingsTrailProps {
	readonly pages: readonly SettingsPage[];
	readonly shown: SettingsPage;
	readonly detail: SettingsDetail | null;
	readonly onShow: (page: SettingsPage) => void;
}

export function SettingsTrail({ pages, shown, detail, onShow }: SettingsTrailProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<div className="sumi-settings-trail">
			<div className="sumi-settings-pages">
				<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
					<PopoverTrigger asChild>
						<Button shape="square" emphasis="ghost" size="sm" label={PAGES}>
							<Icon name="chevron-down" size={ICON_PX} />
						</Button>
					</PopoverTrigger>
					<PopoverContent side="bottom" align="start">
						{pages.map((page) => (
							<PopoverItem
								key={page.id}
								checked={page.id === shown.id}
								icon={<Icon name={page.icon} size={ICON_PX} />}
								onClick={() => {
									setOpen(false);
									onShow(page);
								}}
							>
								{page.title}
							</PopoverItem>
						))}
					</PopoverContent>
				</Popover>
			</div>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>{TITLE}</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						{detail === null ? (
							<BreadcrumbPage>{shown.title}</BreadcrumbPage>
						) : (
							<BreadcrumbLink asChild>
								<button type="button" onClick={detail.onBack}>
									{shown.title}
								</button>
							</BreadcrumbLink>
						)}
					</BreadcrumbItem>
					{detail === null ? null : <BreadcrumbSeparator />}
					{detail === null ? null : (
						<BreadcrumbItem>
							<BreadcrumbPage>{detail.title}</BreadcrumbPage>
						</BreadcrumbItem>
					)}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
