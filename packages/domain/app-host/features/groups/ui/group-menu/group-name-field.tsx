import { createElement as h, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { GroupState } from "../../../../shared/schema/app-tab.schema.js";
import { RenameGroupCommand } from "../../contract.js";

const GROUP_NAME = "Group name";
const FIELD =
	"cv:mx-1.5 cv:mt-1.5 cv:mb-0.5 cv:box-border cv:h-8 cv:w-[calc(100%-12px)] cv:rounded-[8px] cv:border-0 cv:bg-(--sumi-plate) cv:px-[10px] cv:py-0 cv:font-[inherit] cv:text-[13px] cv:text-(--sumi-text) cv:[box-shadow:inset_0_0_0_1.5px_var(--sumi-accent)] cv:outline-none cv:caret-(--sumi-accent)";

export function GroupNameField({
	group,
	onDone,
}: {
	readonly group: GroupState;
	readonly onDone: () => void;
}): ReactElement {
	const [typed, setTyped] = useState(group.name);
	const renameGroup = useCommand(RenameGroupCommand);
	const keep = (): void => {
		if (typed.trim() !== "" && typed !== group.name) {
			void renameGroup.run({
				id: group.id,
				name: typed,
			});
		}
	};
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key !== "Enter") {
			return;
		}

		event.preventDefault();
		keep();
		onDone();
	};
	return (
		<input
			type="text"
			value={typed}
			aria-label={GROUP_NAME}
			className={FIELD}
			onChange={(event) => setTyped(event.target.value)}
			onFocus={(event) => event.target.select()}
			onKeyDown={onKeyDown}
			onBlur={keep}
			data-tabs-group-name=""
		/>
	);
}
