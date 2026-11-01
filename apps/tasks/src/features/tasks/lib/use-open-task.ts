import { useSumiTab } from "../../../sumi/sumi-tab.js";

export const BOARD_ADDRESS = "";

export type OpenTask = (address: string) => void;

export function useOpenTask(): OpenTask {
	return useSumiTab().open;
}
