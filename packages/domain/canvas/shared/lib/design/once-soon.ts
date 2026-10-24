export interface OnceSoon {
	readonly call: () => void;
	readonly cancel: () => void;
}

export function onceSoon(changed: () => void, ms: number): OnceSoon {
	const soon: { timer: number | null } = { timer: null };
	const cancel = (): void => {
		if (soon.timer !== null) window.clearTimeout(soon.timer);
		soon.timer = null;
	};
	const fire = (): void => {
		soon.timer = null;
		changed();
	};
	return { call: () => void (soon.timer ??= window.setTimeout(fire, ms)), cancel };
}
