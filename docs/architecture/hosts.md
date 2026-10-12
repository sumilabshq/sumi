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

## A host writes no code a package uses

Dependencies point one way: packages → apps → hosts. A host only picks and wires; it never holds an implementation that logic in a package calls.

When something differs per platform, **the interface and every implementation live together in the package**, in one folder, named for the platform:

```
packages/canvas/logic/design/
  design-source.ts               interface DesignSource
  obsidian-design-source.ts      over the vault
  web-design-source.ts           over a project in the browser
```

- A platform implementation is exported from its own subpath (`@widgetarium/canvas/obsidian`, `@widgetarium/canvas/web`), so a host bundles only its own and never pulls another platform's API.
- **The host picks the platform's sources and passes them to the app; the app wires everything else.**

  ```ts skip-check
  // hosts/obsidian/src/studio.ts
  const designSource = new ObsidianDesignSource({ obsidian: this.app, registry, host, jobs, place });
  render(<Studio designSource={designSource} />, leaf.contentEl);
  ```

  The app (`<Studio>`) takes its sources as props and creates every handler from them. The host writes no logic: it only chooses which ready implementation to create.

- Go-to-definition on `DesignSource` lands in the folder that holds every implementation.
- A platform file in a host (`hosts/*/src/…-source.ts` imported by logic) is a dependency pointing backwards and is refused.

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
