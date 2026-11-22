# dsc-plugin-template

[简体中文](README.md) | [English]

A template for dsc plugins: source in TypeScript, bundled by esbuild into a single browser ESM file. The build also writes the runtime metadata, optionally signs `plugin.js`, and the output can be installed into DeepSeek-Chat-Enhanced by URL.

## What you get

- a minimal plugin that already runs: manifest, activate, deactivate
- a local copy of the contract types, so type hints work without the DeepSeek-Chat-Enhanced source tree
- a build that bundles `plugin.js`, generates and self-validates `meta.json`, and writes the `MUST_PLUSH_WITH_PACKAGE` marker
- an optional author signing step that writes `plugin.js.author.sig` with openssl
- LF line endings on every text output, with minification on by default
- a set of checkable specs: the runtime spec, the development spec and their JSON Schemas, referenced by other repositories by version

The template does not implement any business logic. It only shows the smallest possible interaction between a plugin and the host: subscribing to the session switch event, writing to the plugin log, and showing one notice through a host message key.

## Quick start

| Item | Requirement |
|:---:|:---:|
| Node.js | 18 or later |
| pnpm | 12 or later |
| OpenSSL | 3.0 or later, needed only when author signing is on |

```bash
git clone https://github.com/omds-chat/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

For build commands, the output list, the `meta.json` rules and local integration see the [build guide](docs/user/develop/build.md); author signing is covered by the [signing guide](docs/user/develop/signing.md).

## Install and verify

1. Serve the `dist/` directory from a local static server.
2. Install the `plugin.js` URL through the install-from-URL field of the plugin panel; the plugin activates right after a successful install.
3. Open the plugin log to see what `context.log` wrote; every session switch appends one line.

`dist/` is ignored by `.gitignore`; the build output `meta.json` is generated from `package.json` and is never edited by hand.

## Project layout

```text
dsc-plugin-template/
├── docs/                     # doc index, user guides and design notes
├── examples/                 # example plugin, not bundled
├── schemas/                  # manifest and runtime meta JSON Schemas with samples
├── scripts/                  # dependency-free spec validator
├── specs/                    # spec area: runtime spec, development spec, version and schemas
├── src/                      # plugin sources: entry, manifest and contract types
├── build.mjs                 # build entry
├── package.json              # project metadata, the source of meta.json
└── .env.example              # environment template: signing key and integration addresses
```

The full tree with per-file notes lives in the [build guide](docs/user/develop/build.md) under "Source layout".

## Specs

The plugin runtime spec, the plugin development spec and their JSON Schemas live in this repository and are the single source of truth; other repositories reference this version instead of keeping their own copy:

| Content | Location |
|:---:|:---:|
| Doc index | [docs/README.md](docs/README.md) |
| Spec area index and known differences | [specs/README.md](specs/README.md) |
| Plugin runtime spec | [specs/plugin-runtime-spec.md](specs/plugin-runtime-spec.md) |
| Plugin development spec | [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md) |
| Spec version and schema paths | [specs/spec-version.json](specs/spec-version.json) |
| Manifest and runtime meta schemas | [schemas/](schemas/manifest/plugin-manifest.schema.json) |
| Reference implementation | [examples/session-digest/](examples/session-digest/index.ts) |

How to reference the specs, lock a version and run the validator is covered by the [specs usage guide](docs/user/develop/specs.md); writing a manifest is covered by the [manifest guide](docs/user/develop/manifest.md).

## Publishing

- Ship the whole `dist/` directory, not just `plugin.js`: `meta.json` is what a market reads to identify the plugin.
- Do not rename the directory layout or the output files; markets and collections parse them by convention.
- Host the output on a static site or CDN that serves `https`; a cross-origin host must return an `Access-Control-Allow-Origin` header.
- Any distribution must tell users to install only plugins from sources they trust.

The full delivery list, offline packages and the pre-release checklist are in the [distribution guide](docs/user/develop/distribution.md); build or install failures are covered by the [FAQ](docs/user/develop/faq.md). The end-user document template is [README.user.md](README.user.md).

## License

[Apache-2.0](LICENSE).
