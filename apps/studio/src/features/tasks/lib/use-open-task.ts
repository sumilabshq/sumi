import { OpenTabCommand } from "@widgetarium/app-host";
import { useCommand } from "@widgetarium/core/requests";

export const BOARD_ADDRESS = "";

const TASKS_APP = "tasks";

export type OpenTask = (address: string) => void;

export function useOpenTask(): OpenTask {
	const openTab = useCommand(OpenTabCommand);
	return (address) => {
		void openTab.run({
			app: TASKS_APP,
			address,
			show: true,
			reusesHeld: true,
		});
	};
}
