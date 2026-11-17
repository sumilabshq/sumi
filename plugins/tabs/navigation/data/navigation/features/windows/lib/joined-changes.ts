import type { TabsGateway } from "../../../gateways/tabs/tabs.gateway.js";

export function joinedWindowsChanged(tabs: TabsGateway, listener: () => void): () => void {
	const heard = { said: "" };
	const joinedSaid = async (): Promise<string> => JSON.stringify((await tabs.placedTabs()).windows);
	void joinedSaid().then((said) => {
		heard.said = said;
	});
	return tabs.placedTabsChanged(() => {
		void joinedSaid().then((said) => {
			if (said !== heard.said) {
				heard.said = said;
				listener();
			}
		});
	});
}
