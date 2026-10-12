# Hosts

A host is a platform an app runs on: Obsidian, the browser, desktop, mobile, a server. Hosts are part of the framework (`@widgetarium/host-*`); a project writes no host code.

| Host                                     | Gives a module                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `host-obsidian`                          | `host.is("obsidian")`, the vault, the window, the plugin's settings, the AI session                           |
| `host-web`                               | `host.is("web")`, browser storage, the URL; serves `/rpc` and webhook routes when the app has server requests |
| `host-desktop`, `host-mobile` _(future)_ | files, notifications, the window                                                                              |

A module picks implementations from the host in its `provide` ([requests.md](requests.md#modules)). Nothing else in a project asks which platform it runs on.

## The Obsidian host

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio; `Open app` and `Create new app` commands.
3. Gives modules the vault, the window and the AI session.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app has…              | It needs                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| no `.onServer()` request | no server; every host runs the handlers itself                              |
| one or more              | one server: the web host serves the pages, `/rpc/<name>` and webhook routes |

There is never a server per device. Desktop and mobile call the same `/rpc`.

## Secrets and config

| Kind          | Lives in                               | Read by                       |
| ------------- | -------------------------------------- | ----------------------------- |
| secret        | the server's environment, never in git | the server module's `provide` |
| public config | any env or a constant                  | everyone                      |

Everything that reaches a browser is public. A key a person types into the Obsidian plugin's settings is their own key on their own machine, not a secret of the app.
