# Hosts

A host is a runtime. It takes an app and runs it on one platform. It knows nothing about any product.

| Host                                       | Hands over                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `hosts/obsidian`                           | the vault as files, notes, Obsidian's window, the plugin's settings, the AI session |
| `hosts/web` _(future)_                     | browser storage, the URL, `fetch`; serves `/rpc` when the app has server handlers   |
| `hosts/desktop`, `hosts/mobile` _(future)_ | files, notifications, the window                                                    |
| `hosts/api` _(future)_                     | `/rpc` alone, for an app that wants an API and no pages                             |

## When a host exists

A person builds in the studio, and the studio runs the app; no host is needed for that. A host is created when the app is shipped outside the studio. Today the only host is Obsidian, because the studio itself runs inside it.

## What a host gives is a port

A host gives everything through ports: `IFiles`, `IStorage`, `INotifications`. A handler that needs files declares `IFiles`. **planned:** every host lists the ports it has, and the build checks every app against every host it ships on — an app on `web` whose handler needs `IFiles` stops the build and names the handler.

## Deploy

| An app has…            | It needs                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| no `.server()` handler | no server; every host runs the handlers itself                             |
| one or more            | one server: the web host serves the pages and one `POST /rpc/<port>` route |
| a public API           | the same route, with keys and a list of public ports                       |

There is never a server per device. Desktop and mobile call the same `/rpc`.

## Secrets and config

| Kind          | Lives in                                                               | Read by                                |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| secret        | the host's environment (Vercel settings, a server's env), never in git | `ctx.secrets` of a `.server()` handler |
| public config | any env or a constant                                                  | everyone                               |

Everything that reaches a browser is public. A secret in a client env is not a secret.

## The Obsidian host

It does four things and nothing else:

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio instead of the markdown editor; lists the vault's apps and creates a new one (the `Open app` and `Create new app` commands).
3. Hands the studio the vault (`IFiles`, the app's project files, the design source), the AI session and the window insets.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault: lays the agent's files, builds the vault's widgets, answers screenshot requests, and opens the design view the chat links to.

TODO: building and installing vault widgets is engine work living in the host until it has a common home.

The AI chat and the catalogue are drawn by the studio in its own panel; the host draws no sidebar of its own.
