import { Repeatable } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { FileListWidthInputSchema, GitLookSchema } from "../../shared/schema/git-look.schema.js";

const LEAST_FILE_LIST_PX = 200;

export const gitLook = query()
	.public()
	.output(GitLookSchema)
	.settlesNow()
	.handle((_input, { gitLook: gitLookGateway }) => gitLookGateway.gitLook());

export const toggleDiffWrap = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook: gitLookGateway, invalidate }) => {
		const was = gitLookGateway.gitLook();
		gitLookGateway.saveGitLook({ ...was, isWrapped: !was.isWrapped });
		invalidate(gitLook);
		console.info(`[widgetarium] git diff wrap ${String(was.isWrapped)} → ${String(!was.isWrapped)} (toggle)`);
	});

export const toggleFileList = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook: gitLookGateway, invalidate }) => {
		const was = gitLookGateway.gitLook();
		gitLookGateway.saveGitLook({ ...was, isFileListShown: !was.isFileListShown });
		invalidate(gitLook);
		console.info(
			`[widgetarium] git file list ${String(was.isFileListShown)} → ${String(!was.isFileListShown)} (toggle)`,
		);
	});

export const toggleFileTree = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { gitLook: gitLookGateway, invalidate }) => {
		const was = gitLookGateway.gitLook();
		gitLookGateway.saveGitLook({ ...was, isFileTree: !was.isFileTree });
		invalidate(gitLook);
		console.info(`[widgetarium] git file tree ${String(was.isFileTree)} → ${String(!was.isFileTree)} (toggle)`);
	});

export const resizeFileList = command()
	.public()
	.input(FileListWidthInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ px }, { gitLook: gitLookGateway, invalidate }) => {
		const was = gitLookGateway.gitLook();
		const now = Math.max(LEAST_FILE_LIST_PX, Math.round(px));
		gitLookGateway.saveGitLook({ ...was, fileListPx: now });
		invalidate(gitLook);
		console.info(`[widgetarium] git file list ${String(was.fileListPx)}px → ${String(now)}px (resize)`);
	});
