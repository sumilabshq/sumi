import type { GitLook } from "../../shared/schema/git-look.schema.js";

export abstract class GitLookGateway {
	abstract gitLook(): GitLook;
	abstract saveGitLook(look: GitLook): void;
}
