import type { GitLook } from "../../shared/schema/git-look.schema.js";
import { GitLookGateway } from "./git-look.gateway.js";

export class MemoryGitLookGateway extends GitLookGateway {
	private look: GitLook = { isWrapped: true, isFileListShown: true, fileListPx: 256, isFileTree: false };

	gitLook(): GitLook {
		return this.look;
	}

	saveGitLook(look: GitLook): void {
		this.look = look;
	}
}
