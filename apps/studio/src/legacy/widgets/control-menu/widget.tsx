import { createElement as h, useState } from "react";
import { z } from "zod";
import { Popover } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { NOTHING_ASKED, NothingAskedSchema, StudioAppSchema } from "../../shared/studio-app.js";
import { QuietLine } from "../quiet-line.js";
import { useRefusal } from "../use-refusal.js";
import type { Answer } from "../use-refusal.js";
import { CurrentApp } from "./current-app.js";
import { MenuTrigger } from "./menu-trigger.js";

const ENTER_CANVAS = { icon: "pencil-ruler", said: "Edit in canvas" };

const LEAVE_CANVAS = { icon: "arrow-left", said: "Back to view" };

const ControlMenu = createWidget({
	inject: {
		getCurrentApp: IQuery.input(NothingAskedSchema).output(StudioAppSchema),
		editInCanvas: ICommand,
		getIsInCanvas: IQuery.output(z.boolean().default(false)),
		backToView: ICommand,
	},
	draw: ({ getCurrentApp, editInCanvas, getIsInCanvas, backToView }) => {
		const [isOpen, setOpen] = useState(false);
		const { data: current, failure: currentFailure } = useData(getCurrentApp, NOTHING_ASKED);
		const { refusal, isAnsweredOk } = useRefusal();
		const closedOnOk = (answer: Promise<Answer>): void => {
			void isAnsweredOk(answer).then((isOk) => isOk && setOpen(false));
		};
		const canvas = getIsInCanvas
			? { ...LEAVE_CANVAS, run: () => closedOnOk(backToView()) }
			: { ...ENTER_CANVAS, run: () => closedOnOk(editInCanvas()) };
		return (
			<Popover
				open={isOpen}
				onOpenChange={setOpen}
				placement="below"
				trigger={<MenuTrigger app={current} isOpen={isOpen} />}
			>
				<div className="wg-studio-menu" data-name="Control menu">
					{current ? (
						<CurrentApp app={current} canvas={canvas} />
					) : (
						<QuietLine said={currentFailure} name="Current app failure" />
					)}
					<QuietLine said={refusal} name="Refusal" />
				</div>
			</Popover>
		);
	},
});

export const metadata = defineMetadata(ControlMenu, {
	title: "Control menu",
	description: "The studio's corner button: edit, set up and connect this workspace.",
	keywords: ["menu", "control", "settings", "studio", "corner", "workspace"],
	props: {
		getCurrentApp: { label: "This workspace", hint: "The workspace the studio shows: its mark is the button." },
		editInCanvas: { label: "Edit in canvas", hint: "Shows this app's design canvas." },
		getIsInCanvas: { label: "In the canvas", hint: "On, the menu offers to go back to the app." },
		backToView: { label: "Back to view", hint: "Leaves the canvas for the app." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 34, preferredHeight: 34 } });

export default ControlMenu;
