import type { Send } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { settleAsked } from "../../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../../shared/lib/tab-showing/tab-settling.js";

export interface FlowDeleted {
	readonly flowId: string;
	readonly failedChatIds: readonly string[];
}

export async function deleteFlowWithChats(reach: TabsReach, flowId: string): Promise<FlowDeleted> {
	const chatIds = await chatIdsOfFlow(reach.send, flowId);
	await settleAsked(reach, (at) => reach.send(navigation.flows.deleteFlow, { at, flowId }));
	console.info(`[widgetarium] flow ${flowId} deleted from the doc, ${chatIds.length} chats pending deletion`);
	const failedChatIds = await deletedChats(reach.send, chatIds);
	return { flowId, failedChatIds };
}

export function failureOfDeleting(deleted: readonly FlowDeleted[]): Error | null {
	const failed = deleted.flatMap(({ failedChatIds }) => failedChatIds);

	if (failed.length === 0) {
		return null;
	}

	return new Error(`${failed.length} chat(s) could not be deleted and stay in the chat list: ${failed.join(", ")}`);
}

async function chatIdsOfFlow(send: Send, flowId: string): Promise<readonly string[]> {
	const detail = await send(navigation.flows.one, { flowId });

	if (detail === null) {
		throw new Error(`no flow "${flowId}" stands here`);
	}

	return detail.tabs.filter(({ isChat }) => isChat).map(({ id, address }) => address ?? id);
}

async function deletedChats(send: Send, chatIds: readonly string[]): Promise<readonly string[]> {
	const failed: string[] = [];

	for (const id of chatIds) {
		try {
			await send(workspaces.chats.deleteChat, { id });
			console.info(`[widgetarium] chat ${id} kept → deleted`);
		} catch (failure: unknown) {
			failed.push(id);
			console.error(`[widgetarium] chat ${id} kept → kept: deleteChat failed`, failure);
		}
	}

	return failed;
}
