import { terminal } from "@sumi/contract";
import { AuthenticatedGuard, PerCall, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { ShowChangesAskSchema, ShownChangesSchema } from "../../shared/schema/git-work.schema.js";
import { gitLinkOf, rangeLabelOf } from "./lib/range-words.js";

const NOT_A_REPO = "{folder} is not inside a git repository";

export const showChanges = command()
	.public()
	.metadata({
		description:
			"Show git changes in this chat: the uncommitted ones, one commit, or two branches or commits compared. One file opens as its diff; several open as a list the person presses into, a file at a time. Use it instead of pasting a diff.",
		mcp: {
			kind: "read",
			running: "Showing changes",
			done: "Showed changes",
			ui: { resourceUri: "ui://git-changes" },
		},
	})
	.input(ShowChangesAskSchema)
	.output(ShownChangesSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ folder, only, base, head, paths }, { send }) => {
		const top = await send(terminal.programs.run, {
			folder,
			program: "git",
			args: ["rev-parse", "--show-toplevel"],
		});

		if (top.code !== 0) {
			return refuse(NOT_A_REPO.replace("{folder}", folder));
		}

		const root = top.out.trim();
		const ask = { folder: root, only, base, head };
		return {
			...ask,
			paths,
			label: rangeLabelOf(ask),
			link: gitLinkOf(ask),
		};
	});
