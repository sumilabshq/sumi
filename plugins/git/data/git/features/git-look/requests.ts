import { Repeatable } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { FileListWidthInputSchema, GitLookSchema } from "../../shared/schema/git-look.schema.js";

const LEAST_FILE_LIST_PX = 200;

export const GitLookQuery = query("git-look")
	.public()
	.output(GitLookSchema)
	.settlesNow()
	.handle((_input, { gitLook }) => gitLook.gitLook());

export const ToggleDiffWrapCommand = command("toggle-diff-wrap")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook, invalidate }) => {
		const was = gitLook.gitLook();
		gitLook.saveGitLook({ ...was, isWrapped: !was.isWrapped });
		invalidate(GitLookQuery);
		console.info(`[widgetarium] git diff wrap ${String(was.isWrapped)} → ${String(!was.isWrapped)} (toggle)`);
	});

export const ToggleFileListCommand = command("toggle-file-list")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook, invalidate }) => {
		const was = gitLook.gitLook();
		gitLook.saveGitLook({ ...was, isFileListShown: !was.isFileListShown });
		invalidate(GitLookQuery);
		console.info(
			`[widgetarium] git file list ${String(was.isFileListShown)} → ${String(!was.isFileListShown)} (toggle)`,
		);
	});

export const ToggleFileTreeCommand = command("toggle-file-tree")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook, invalidate }) => {
		const was = gitLook.gitLook();
		gitLook.saveGitLook({ ...was, isFileTree: !was.isFileTree });
		invalidate(GitLookQuery);
		console.info(`[widgetarium] git file tree ${String(was.isFileTree)} → ${String(!was.isFileTree)} (toggle)`);
	});

export const ResizeFileListCommand = command("resize-file-list")
	.public()
	.input(FileListWidthInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ px }, { gitLook, invalidate }) => {
		const was = gitLook.gitLook();
		const now = Math.max(LEAST_FILE_LIST_PX, Math.round(px));
		gitLook.saveGitLook({ ...was, fileListPx: now });
		invalidate(GitLookQuery);
		console.info(`[widgetarium] git file list ${String(was.fileListPx)}px → ${String(now)}px (resize)`);
	});
