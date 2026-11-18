import { z } from "zod";
import { tabEntryOf } from "../../../shared/lib/tabs/tab-lists.js";

export interface GroupsReshaped {
	readonly tabs: unknown;
	readonly reshaped: number;
}

const OldGroupSchema = z.looseObject({
	tabIds: z.array(z.string()),
	entries: z.undefined().optional(),
});

const GroupsHolderSchema = z.looseObject({ groups: z.array(z.unknown()).optional() });

const KeptWithGroupsSchema = GroupsHolderSchema.extend({ sessions: z.array(z.unknown()).optional() });

export function groupEntriesOf(tabs: unknown): GroupsReshaped {
	const kept = KeptWithGroupsSchema.safeParse(tabs);

	if (!kept.success) {
		return {
			tabs,
			reshaped: 0,
		};
	}

	const own = holderReshaped(kept.data);
	const sessions = (kept.data.sessions ?? []).map(holderReshaped);
	return {
		tabs: {
			...own.tabs,
			...(kept.data.sessions === undefined ? {} : { sessions: sessions.map((session) => session.tabs) }),
		},
		reshaped: own.reshaped + sessions.reduce((sum, session) => sum + session.reshaped, 0),
	};
}

function holderReshaped(holder: unknown): { readonly tabs: object; readonly reshaped: number } {
	const held = GroupsHolderSchema.safeParse(holder);

	if (!held.success || held.data.groups === undefined) {
		return {
			tabs: held.success ? held.data : {},
			reshaped: 0,
		};
	}

	const groups = held.data.groups.map(groupReshaped);
	return {
		tabs: {
			...held.data,
			groups: groups.map((group) => group.kept),
		},
		reshaped: groups.filter((group) => group.isReshaped).length,
	};
}

function groupReshaped(group: unknown): { readonly kept: unknown; readonly isReshaped: boolean } {
	const old = OldGroupSchema.safeParse(group);

	if (!old.success) {
		return {
			kept: group,
			isReshaped: false,
		};
	}

	const { tabIds, ...face } = old.data;
	return {
		kept: {
			...face,
			entries: tabIds.map(tabEntryOf),
		},
		isReshaped: true,
	};
}
