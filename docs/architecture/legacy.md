# Legacy

Code written before these rules lives in a `legacy/` folder inside the app or host that runs it: `apps/studio/src/legacy/`, `packages/host-obsidian/src/legacy/`. It works as it does today; it is moved there, not changed.

| Rule                                                                             | Why                                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| nothing new is written in `legacy/`                                              | the folder only shrinks                              |
| only its own app or host imports it                                              | no domain grows a dependency on code that is leaving |
| a piece leaves by being rewritten into a domain, then its legacy file is deleted | there is one copy of each thing at any time          |
| a legacy file nothing imports goes to the Trash                                  | dead code is not kept "in case"                      |

A rewrite takes one piece at a time — one feature, one domain package — and the app keeps running between pieces.
