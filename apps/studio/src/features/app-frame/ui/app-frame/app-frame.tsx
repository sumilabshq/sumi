import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { AppPageSchema, RecordAppPageCommand } from "@widgetarium/places";
import { OpenLinkCommand } from "@widgetarium/app-host";
import { useApp, useCommand } from "@widgetarium/core/requests";
import { useAppFrameFleet } from "../../lib/app-frames-context.js";
import { FrameLinkPace, linkToOpenOf } from "../../lib/frame-link.js";
import type { FrameLink } from "../../lib/frame-link.js";
import { reportFrameProblem } from "../../lib/frame-problem.js";
import { frameServicesOf } from "../../lib/frame-services.js";
import { useAppFrameSeat } from "../../lib/use-app-frame-seat.js";
import { FrameNote } from "../frame-note/frame-note.js";
import { FrameWindow } from "./frame-window.js";
import type { FrameWorkspace, ReportedPage } from "./frame-window.js";

export interface AppFrameProps {
	readonly app: string;
	readonly tabId: string;
	readonly address: string;
	readonly workspace: FrameWorkspace;
	readonly isShown: boolean;
}

const LOADING = "Opening {app}";
const NOT_OPENED = "the link {href} was not opened: {why}";
const TOO_MANY_LINKS = "the app opened too many links at once";

export function AppFrame({ app, tabId, address, workspace, isShown }: AppFrameProps): ReactElement {
	const fleet = useAppFrameFleet();
	const { frameId, running } = useAppFrameSeat(fleet, app, isShown);
	const recordPage = useCommand(RecordAppPageCommand);
	const openLink = useCommand(OpenLinkCommand);
	const studio = useApp("AppFrame");
	const [linkPace] = useState(() => new FrameLinkPace());
	const services = useMemo(() => frameServicesOf(app, studio.send.bind(studio)), [app, studio]);

	if (running === null) {
		return <FrameNote said={LOADING.replace("{app}", app)} />;
	}

	const record = (page: ReportedPage): void => {
		const read = AppPageSchema.safeParse({
			id: tabId,
			...page,
		});

		if (!read.success) {
			reportFrameProblem(
				app,
				`a page fact was dropped: ${read.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
			);
			return;
		}

		recordPage.run(read.data).then(
			(answer) => {
				if (!answer.ok) {
					reportFrameProblem(app, `Places did not record the page: ${answer.reason}`);
				}
			},
			(thrown: unknown) => reportFrameProblem(app, `Places did not record the page: ${String(thrown)}`),
		);
	};

	const open = (link: FrameLink): void => {
		const notOpened = (why: string): void =>
			reportFrameProblem(app, NOT_OPENED.replace("{href}", JSON.stringify(link.href)).replace("{why}", why));

		if (!linkPace.admits(Date.now())) {
			notOpened(TOO_MANY_LINKS);
			return;
		}

		openLink.run(linkToOpenOf(link)).then(
			(answer) => {
				if (!answer.ok) {
					notOpened(answer.reason);
				}
			},
			(thrown: unknown) => notOpened(String(thrown)),
		);
	};

	return (
		<FrameWindow
			key={`${running.version}:${running.loads}`}
			app={app}
			url={running.pageUrl}
			address={address}
			workspace={workspace}
			isShown={isShown}
			onPage={record}
			onReady={() => fleet.ready(frameId)}
			onBusy={(isBusy) => fleet.busyIs(frameId, isBusy)}
			onFailed={(reason) => fleet.failedStart(frameId, reason)}
			onLink={open}
			onAsk={services}
		/>
	);
}
