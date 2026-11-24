import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import { commandMenu } from "@sumi/command-menu/contract";
import type { Intent } from "@sumi/command-menu/contract";
import { useAskComposer } from "@sumi/sumi-host-plugin";
import type { Launch, PaneSpot } from "./launch-types.js";
import { paneAppOf } from "./launch-of.js";

const NEW_FLOW_NAME = "New flow";
const LOOSE_FLOW = {
	folderId: null,
	before: null,
};

export function useLaunchActs({ flowId, paneId }: PaneSpot): (launch: Launch) => void {
	const openTab = useCommand(appHost.flows.openTab);
	const openFlow = useCommand(appHost.flows.open);
	const createFlow = useCommand(navigation.flows.create);
	const runIntent = useCommand(commandMenu.doing.runIntent);
	const askComposer = useAskComposer();
	const startFlow = async (): Promise<void> => {
		const made = await createFlow.run({ name: NEW_FLOW_NAME, place: LOOSE_FLOW });

		if (made.ok) {
			await openFlow.run({ flowId: made.output.flowId });
		}
	};
	const runMenuIntent = async (intent: Intent): Promise<void> => {
		const done = await runIntent.run({ intent });

		if (!done.ok) {
			console.error(`[sumi] home launch ${intent.do} refused: ${done.reason}`);
			return;
		}

		if (intent.do === "ask-ink") {
			askComposer.ask(intent.text, intent.sends, done.output.chatId);
		}
	};
	return ({ act }) => {
		if (act.kind === "new-flow") {
			void startFlow();
			return;
		}

		const app = paneAppOf(act.intent);

		if (app === null) {
			void runMenuIntent(act.intent);
			return;
		}

		void openTab.run({ flowId, paneId, app, address: null });
	};
}
