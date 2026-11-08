export interface TabRef {
	readonly id: string;
	readonly groupId: string | null;
	readonly splitId: string | null;
	readonly list: string;
	readonly isHolder: boolean;
	readonly isNestable: boolean;
	readonly isTearable: boolean;
}
