import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PickFolderCommand } from "@sumi/contract";
import type { RepoRow } from "@sumi/git";
import { useCommand } from "@widgetarium/data-framework";
import { LAST_COMMIT } from "../../lib/git-address.js";
import type { GitAddress } from "../../lib/git-address.js";
import { Glyph } from "../glyph/glyph.js";

export interface NoRepoProps {
	readonly title: string;
	readonly said: string;
	readonly repos: readonly RepoRow[];
	go(next: GitAddress): void;
}

const INSIDE = "Inside this folder";
const OPEN_FOLDER = "Open folder…";

export function NoRepo({ title, said, repos, go }: NoRepoProps): ReactElement {
	const pickFolder = useCommand(PickFolderCommand);
	const open = (folder: string): void =>
		go({
			folder,
			head: null,
			base: LAST_COMMIT,
			only: null,
		});
	const openPicked = async (): Promise<void> => {
		const answer = await pickFolder.run();

		if (!answer.ok || answer.output.path === null) {
			return;
		}

		open(answer.output.path);
	};
	return (
		<section className="wg-git-empty">
			<div>
				<h1>{title}</h1>
				<p>{said}</p>
				{repos.length === 0 ? null : <div className="wg-git-mlabel">{INSIDE}</div>}
				{repos.map((repo) => (
					<button key={repo.path} className="wg-git-row" onClick={() => open(repo.path)}>
						<Glyph name="folder" />
						<span className="wg-git-nm">{repo.name}</span>
						<span className="wg-git-dim">{repo.branch ?? ""}</span>
						{repo.changed > 0 ? <span className="wg-git-dot" /> : null}
					</button>
				))}
				<button className="wg-git-row is-quiet" onClick={() => void openPicked()}>
					<Glyph name="plus" />
					<span className="wg-git-nm">{OPEN_FOLDER}</span>
				</button>
			</div>
		</section>
	);
}
