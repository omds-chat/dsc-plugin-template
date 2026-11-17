# dsc-plugin-template

[简体中文](README.md) | [English]

A template for dsc plugins: source in TypeScript, bundled by esbuild into a single browser ESM file that can be installed into dsc by URL.

## Purpose

This template is a minimal project that already runs, and it contains:

- a working plugin manifest and lifecycle entry points
- a local copy of the contract types, so type hints work without the dsce source tree
- a TypeScript and esbuild setup whose output is always a single file

The template does not implement any business logic. It only shows the smallest possible interaction between a plugin and the host: subscribing to session switches, writing plugin logs, and showing one host notice through an existing message key.

## Project layout

```
dsc-plugin-template/
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md
├── README.en-US.md
├── build.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── src/
    ├── index.ts
    ├── manifest.ts
    └── types.ts
```

| File | Role |
|:---:|:---:|
| `package.json` | Project metadata, scripts and dev dependencies |
| `pnpm-lock.yaml` | Dependency lockfile written by `pnpm install`, recommended to commit |
| `pnpm-workspace.yaml` | pnpm 12 settings file, allows the esbuild install script |
| `build.mjs` | esbuild script, writes `dist/plugin.js` |
| `tsconfig.json` | TypeScript strict configuration, type check only, no output |
| `src/manifest.ts` | Plugin manifest |
| `src/index.ts` | Activation and deactivation entry points |
| `src/types.ts` | Trimmed local copy of the plugin contract types |

## Requirements

| Item | Requirement |
|:---:|:---:|
| Node.js | 18 or later |
| pnpm | 12 or later |
| Output browsers | Chrome 105, Edge 105, Safari 16, Firefox 110 |

pnpm 12 does not run dependency install scripts by default; `pnpm-workspace.yaml` allows the esbuild build script through `allowBuilds`, so do not delete that file.

## Quick start

```bash
git clone https://github.com/omdsc-dev/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

The output is `dist/plugin.js`. The build script clears `dist/` first, then checks that exactly one js file exists and prints the output path and size.

| Command | Role |
|:---:|:---:|
| `pnpm install` | Install dev dependencies |
| `pnpm run type` | Run `tsc --noEmit` for a type check |
| `pnpm run build` | Bundle the plugin and print path and size |

## Installing the output into dsce

1. Serve `dist/plugin.js` from a local static server, for example `http://localhost:8090/plugin.js`.
2. Open the plugin panel with the plugin button at the bottom of the sidebar.
3. Paste the output URL into the install-from-URL field at the bottom of the panel, then click install.
4. The plugin activates right after a successful install, and its status in the installed list shows as running.
5. Open the plugin log to see what `context.log` wrote; every session switch appends one line.

URL rules: use an `https://` URL when distributing. For local debugging dsce accepts `http://localhost`, `http://127.0.0.1` and `http://[::1]`; every other address must use `https://`.

After changing the output, uninstall the plugin in the panel and install it again, because the browser caches the module for a given URL.

## Editing the manifest

The manifest lives in [src/manifest.ts](src/manifest.ts) and is re-exported by [src/index.ts](src/index.ts). Installation uses the `manifest` exported by the output.

| Field | Required | Notes |
|:---:|:---:|:---:|
| `id` | yes | Plugin identifier, must match `^[a-z][a-z0-9-]{2,63}$`, the repository convention is a `dsc-` prefix |
| `name` | yes | Display name, must not be empty |
| `version` | yes | Plugin version, three numeric segments such as `0.1.0` |
| `engines` | no | Compatible dsc-core range, supports `^`, `~`, `>=`, `<=` and an exact version |
| `dependencies` | no | Required plugin ids, present at install time and active at activation time |
| `conflicts` | no | Conflicting plugin ids, installing both is rejected |
| `capabilities` | yes | Requested capabilities, no duplicates |
| `contributions` | no | Subscribed contribution points, currently only `session:changed` |

Things to keep in mind:

- `id` is globally unique; a second plugin with the same id is rejected.
- `version` is the plugin version and is unrelated to the version in `package.json`.
- `capabilities` may only contain names from the capability table; unknown or duplicate entries make the install fail.
- The organization keeps a contract reference at `.agents/dsc-plugin-contract.md`; if it disagrees with the dsce source, the source wins.

## Capabilities

| Capability | Context member | Rate limit |
|:---:|:---:|:---:|
| `sessions:list` | `context.sessions.list` | 30 calls / 10 s |
| `sessions:read` | `context.sessions.read` | 30 calls / 10 s |
| `sessions:rename` | `context.sessions.rename` | 5 calls / 10 s |
| `events:session` | `context.events.on` | 5 calls / 10 s |
| `notify` | `context.ui.notify` | 10 calls / 10 s |
| `settings:locale` | `context.settings.locale` | 60 calls / 10 s |
| `plugins:storage` | `context.storage` | 100 calls / 10 s, 64KB per plugin |

`net:fetch` is available to built-in plugins only; a third-party manifest that requests it is rejected as an unknown capability.

The template requests `events:session` and `notify`, and subscribes to the single contribution point `session:changed`.

## Release and distribution

- Put the plugin id and version into the output file name, for example `dsc-demo-log-0.1.0.js`, so users can tell versions apart.
- Host the output on a static site or CDN that serves `https` and keep the URL stable; a dead URL shows the installed plugin as failed to start.
- Before publishing, run `import('https://your-host/dsc-demo-log-0.1.0.js')` once in the browser console to confirm there is no syntax error and no missing dependency.
- `dist/` is generated by the build and ignored by `.gitignore`; attach the output to a release when you need to ship it.
- Plugins run in the user browser and can reach the API key and the current conversation, so any distribution must tell users to install only plugins from sources they trust.
- When submitting to a plugin market, the output must still export `manifest`, or the market index entry must carry the manifest inline.

## FAQ

### The output is not a single file

`build.mjs` disables code splitting, clears `dist/`, and verifies afterwards that `plugin.js` is the only file. If extra files appear, check for dynamic `import()` calls or for assets that need a separate output.

### Missing manifest

The install result is `invalid-manifest` and the host shows `pluginManifestMissing`, which usually means the output does not export `manifest`. Make sure [src/index.ts](src/index.ts) keeps `export { manifest } from './manifest.js'` and that `build.mjs` still uses `src/index.ts` as the entry point.

### Incompatible version

The install result is `incompatible-version`, which means `engines` does not match the host dsc-core version. The current host is `1.0.0` and the template uses `^1.0.0`; adjust `engines` when the host major version changes.

## License

[Apache-2.0](LICENSE).
