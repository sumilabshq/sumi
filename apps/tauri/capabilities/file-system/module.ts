import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { fileSystemPartsOn } from "./gateways/file-system-parts/file-system-parts.gateway.js";
import {
	AppendFileCommand,
	CopyCommand,
	FileAccessGuard,
	FileCallLoggerMiddleware,
	FileInfoQuery,
	MakeFolderCommand,
	ReadFileQuery,
	ReadFolderQuery,
	RemoveCommand,
	RenameCommand,
	WriteFileCommand,
} from "./features/files/requests.js";

export const FileSystemModule = module("file-system")
	.on(Server)
	.public(
		ReadFileQuery,
		ReadFolderQuery,
		FileInfoQuery,
		WriteFileCommand,
		AppendFileCommand,
		MakeFolderCommand,
		RemoveCommand,
		RenameCommand,
		CopyCommand,
	)
	.guard(AuthenticatedGuard)
	.guard(FileAccessGuard)
	.use(FileCallLoggerMiddleware)
	.provide((facts) => fileSystemPartsOn(facts));
