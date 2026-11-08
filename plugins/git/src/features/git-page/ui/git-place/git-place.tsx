import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GitPlaceQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import type { GitAddress } from "../../lib/git-address.js";
import { GitNote } from "../git-note/git-note.js";
import { NoRepo } from "../no-repo/no-repo.js";
import { RepoPage } from "../repo-page/repo-page.js";

export interface GitPlaceProps {
	readonly address: GitAddress;
	go(next: GitAddress): void;
}

const NOT_A_REPO = "Not a Git folder";
const NOT_A_REPO_SAID = "{folder} has no repository.";
const MISSING = "Folder not found";
const MISSING_SAID = "{folder} does not exist.";

export function GitPlace({ address, go }: GitPlaceProps): ReactElement | null {
	const place = useOptionalQuery(GitPlaceQuery, { folder: address.folder });

	if (place.failure !== null) {
		return <GitNote said={place.failure} />;
	}

	if (place.data === null) {
		return null;
	}

	if (place.data.kind === "repo") {
		return <RepoPage place={place.data} address={address} go={go} />;
	}

	if (place.data.kind === "missing") {
		return <NoRepo title={MISSING} said={MISSING_SAID.replace("{folder}", address.folder)} repos={[]} go={go} />;
	}

	return (
		<NoRepo
			title={NOT_A_REPO}
			said={NOT_A_REPO_SAID.replace("{folder}", address.folder)}
			repos={place.data.repos}
			go={go}
		/>
	);
}
