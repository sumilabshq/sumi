# Lint

Every rule in these pages is a folder, a file name or a type, so a tool checks it, not a review. A rule is switched on only after a count shows which files it would refuse.

| Rule          | Refuses                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| levels        | an import against the table in [README.md](README.md#imports); a package importing an app          |
| public API    | an import of another package by any path but its `index.ts`                                        |
| declared      | an import of a domain not listed in `package.json` dependencies                                    |
| no cycles     | a cycle in the graph of domains                                                                    |
| request names | a request name that is not `<module>/<constant in kebab case>`                                     |
| idempotency   | a command with no `idempotencyKey` (a type error, not lint)                                        |
| uniqueness    | a table with no `unique` choice (a type error, not lint)                                           |
| one handler   | a request with no handler, or two handlers across the app's modules                                |
| blocks        | hand-written pointer or scroll math in a block; a decision about request data in a block (warning) |
| new in a page | `new` of a handler or an adapter outside a module                                                  |
| server        | a server-only file reached from a client bundle (a build error naming the chain)                   |
| size          | a file over 200 lines, a component over 80                                                         |
| index files   | anything in an `index.ts` but re-exports                                                           |
| legacy        | a new file in a `legacy/` folder; an import of `legacy/` from outside its owner                    |

Every rule is **planned** unless the code says otherwise. Each check is proven by breaking it on purpose: write the file it must refuse, see it red, remove the file. A rule's message says what to do, not only what is wrong.
