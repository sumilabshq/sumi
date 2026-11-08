import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ComparisonQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { comparisonInputOf, useGitPage } from "../../lib/git-page-context.js";
import { fileCountOf } from "../../lib/git-names.js";
import { ChangeNums } from "../change-nums/change-nums.js";

export function ChangeTotals(): ReactElement | null {
	const comparison = useOptionalQuery(ComparisonQuery, comparisonInputOf(useGitPage())).data;

	if (comparison === null) {
		return null;
	}

	return (
		<div className="wg-git-meta">
			<span>{fileCountOf(comparison.files.length)}</span>
			<ChangeNums added={comparison.added} removed={comparison.removed} hidesZero={false} />
		</div>
	);
}
