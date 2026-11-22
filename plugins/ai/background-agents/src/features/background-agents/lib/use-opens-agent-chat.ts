import { useContext } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import { AGENT_CHAT_APP, addressOfAgentChat } from "../../../shared/lib/agent-chat-address.js";
import { WindowAppContext } from "./window-app-context.js";

const NOT_OPENED = "[background-agents] chat {chat}: agent {agent} not opened ({why})";
const NO_WINDOW = "no window app is lent here";

export function useOpensAgentChat(chat: string): (agent: string) => void {
	const windowApp = useContext(WindowAppContext);
	return (agent) => {
		const said = NOT_OPENED.replace("{chat}", chat).replace("{agent}", agent);

		if (windowApp === null) {
			console.warn(said.replace("{why}", NO_WINDOW));
			return;
		}

		const target = { kind: "app" as const, app: AGENT_CHAT_APP, address: addressOfAgentChat({ chat, agent }) };
		void windowApp.send(appHost.tabActions.navigate, { target, where: "new-tab", from: chat }).then((answer) => {
			if (!answer.ok) {
				console.warn(said.replace("{why}", answer.reason));
			}
		});
	};
}
