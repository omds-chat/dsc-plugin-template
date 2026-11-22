# 构建与联调指南

构建入口是 [build.mjs](../../../build.mjs):清空 `dist/`、esbuild 打包 `plugin.js`、从 `package.json` 生成并自校验 `meta.json`、写入 `MUST_PLUSH_WITH_PACKAGE` 标记,并可选地用 openssl 对 `plugin.js` 产出作者签名(见 [signing.md](signing.md))。签名与联调的环境变量模板见 [.env.example](../../../.env.example)。

## 环境要求

| 项 | 要求 |
|:---:|:---:|
| Node.js | 18 或更高版本 |
| pnpm | 12 或更高版本 |
| OpenSSL | 3.0 或更高版本,仅启用作者签名时需要 |
| 产物目标浏览器 | Chrome 105、Edge 105、Safari 16、Firefox 110 |

pnpm 12 默认不执行依赖的安装脚本,仓库里的 `pnpm-workspace.yaml` 通过 `allowBuilds` 显式允许 esbuild 的构建脚本,请不要删除这个文件。

## 命令

```bash
git clone https://github.com/omds-chat/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

| 命令 | 作用 |
|:---:|:---:|
| `pnpm install` | 安装开发依赖 |
| `pnpm run type` | 运行 `tsc --noEmit` 做类型检查 |
| `pnpm run build` | 构建全部产物 |
| `pnpm run build -- --no-minify` | 关闭行压缩后再构建 |
| `pnpm run validate:specs` | 校验规范区的 Schema、样例与本仓库 meta 数据 |

`build.mjs` 支持 `--no-minify` 一个参数,关闭 esbuild 的行压缩。压缩后的产物体积明显更小,分发时建议保持默认压缩。

## 构建产物

构建先清空 `dist/`,再依次产出以下文件:

```text
dist/
├── meta.json                  # 运行时元数据,从 package.json 生成
├── plugin.js                  # 运行时脚本,单文件 ESM
├── plugin.js.author.sig       # plugin.js 的作者分离签名,仅在启用作者签名时产出
├── author_pub.pem             # 作者公钥,仅在启用作者签名时产出,交给合集
└── MUST_PLUSH_WITH_PACKAGE    # 标记文件,内容为空
```

| 产物 | 何时产出 | 说明 |
|:---:|:---:|:---:|
| `meta.json` | 每次构建 | 生成后立即按 `schemas/runtime/meta.json` 的规则自校验,不通过则构建失败 |
| `plugin.js` | 每次构建 | 单文件 ESM,导出 `manifest` 与 `activate` |
| `plugin.js.author.sig` | 仅启用作者签名时 | `plugin.js` 的裸公钥分离签名,64 字节二进制 |
| `author_pub.pem` | 仅启用作者签名时 | 由私钥推导出的公钥,交给插件合集 |
| `MUST_PLUSH_WITH_PACKAGE` | 每次构建 | 空文件,表示该目录内容必须随包分发 |

文件名按约定原样保留,`MUST_PLUSH_WITH_PACKAGE` 的拼写不要改成 `PUSH`。

构建结束时脚本会打印每个产物的大小、压缩开关、签名状态,并检查 `dist/` 里没有预期之外的文件。打印体积只是信息,脚本不与 2 MB 上限比对,也不会因此让构建失败:超限产物照常产出,到宿主安装时才按 `package-too-large` 拒绝。文本产物(`meta.json`、`plugin.js`、`author_pub.pem`)按 LF 落盘,若检测到 CR 字节直接报错;`.author.sig` 是二进制签名,不参与换行检查。

出现预期之外的文件,说明源码用了动态 `import()` 或引入了需要单独输出的资源,排查路径见 [faq.md](faq.md)。

## meta.json 生成规则

`meta.json` 由 `package.json` 生成,不手工维护。

| `meta.json` 字段 | 来源 | 必填 |
|:---:|:---:|:---:|
| `name` | `package.json` 的 `name` | 是 |
| `version` | `package.json` 的 `version` | 是 |
| `license` | `package.json` 的 `license` | 是 |
| `author` | `package.json` 的 `author`,字符串形式 | 是 |
| `description` | `dsc.description`,对象,至少含 `zh-CN` 或 `en-US` | 是 |
| `repo_link` | `dsc.repo_link` | 是 |
| `dependencies.dsc` | `dsc.engines` | 是 |
| `home_page` | `dsc.home_page`,缺省则不写 | 否 |
| `attached` | `dsc.attached`,缺省则不写 | 否 |
| `capabilities` | `dsc.capabilities`,缺省则不写 | 否 |
| `mounts` | `dsc.mounts`,缺省则不写 | 否 |
| `conflicts` | `dsc.conflicts`,缺省则不写 | 否 |

`capabilities`、`mounts` 与 `conflicts` 由构建原样搬运:`package.json` 的 `dsc` 块里写什么就产出什么,没写就不产出该字段,构建不补空数组,也不改写取值。取值仍须落在 Schema 允许的范围内——能力名取自能力表,挂载点名取自挂载点表,`conflicts` 的元素须是插件 id——非法取值在构建期直接报错。手工补进 `dist/` 的字段不会保留:`meta.json` 每次构建都从 `package.json` 重新生成。

`package.json` 里的 `dsc` 块:

```json
"dsc": {
  "engines": "^1.0.0",
  "description": { "zh-CN": "示例插件", "en-US": "Demo plugin" },
  "home_page": "https://github.com/omds-chat/dsc-plugin-template",
  "repo_link": "https://github.com/omds-chat/dsc-plugin-template",
  "capabilities": ["events:session", "notify"],
  "mounts": ["session:changed"]
}
```

改插件名时同步改 `package.json` 的 `name`:它必须匹配 `dsc-xxx` 或 `@scope/dsc-xxx`,否则 `meta.json` 校验失败。改版本时同步改 `version`,只允许 `x.y.z` 三段数字。

## 把产物装进宿主验证

用于在本地验证构建结果:

1. 用本地静态服务器提供 `dist/` 目录。
2. 在插件面板的「从地址安装」中填入 `plugin.js` 的地址并安装;安装成功后插件自动激活,状态显示为「运行中」。
3. 打开「查看日志」可以看到 `context.log` 写入的内容,切换会话后日志会追加一条。

面向普通用户的说明见 [README.user.md](../../../README.user.md)。

地址规则:分发给用户时使用 `https://` 地址。本地调试时 DeepSeek-Chat-Enhanced 允许 `http://localhost`、`http://127.0.0.1` 与 `http://[::1]`,其余地址必须是 `https://`。

安装记录会保存产物的代码文本,启动恢复不再取件;产物改动后需要先在面板卸载再重新安装,才会重新取回新字节。

部署要求:宿主安装时用 `fetch` 取产物字节,再按 UTF-8 文本保存,因此托管方必须返回 `Access-Control-Allow-Origin` 响应头,例如 `Access-Control-Allow-Origin: *`,否则插件产物托管在另一个源时取件会被拒绝,安装失败。取件默认不携带凭证,不需要 `Access-Control-Allow-Credentials`;把产物与页面放在同一域名下同源部署,则不需要该响应头。

## 本地联调地址

跨仓库离线联调时,先在仓库根目录建一份 `.env`:

```bash
cp .env.example .env
```

| 变量 | 本地取值 | 说明 |
|:---:|:---:|:---:|
| `DS_CHAT_PAGES_LINK` | `http://127.0.0.1:61117` | 对话页面地址 |
| `DSC_INNER_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61118` | 内部插件合集页地址 |
| `AWESOME_DSC_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61119` | 社区插件合集页地址 |

这三个取值是本地联调用的回环地址,不是分发地址;对外分发仍按上文规则使用 `https://`。联调服务的启动命令与端口表以工作区交接文档为准;本地静态服务器与本地 npm registry 模拟器的工具分别是组织仓库 `.github/tools/dev-static-server` 与 `.github/tools/dev-local-npmjs`。

模板仓库只消费这些地址做联调,不写入产物:`build.mjs` 不读取它们,`dist/` 下的文件与 `meta.json` 都不含这些取值。`.env` 已被 `.gitignore` 忽略,不会进 git;`.env.example` 随仓库提交,只放示例取值。

## 源码结构

```text
dsc-plugin-template/
├── .env.example              # 环境变量模板:作者签名与本地联调地址
├── .gitattributes            # 全仓库统一 LF
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md                 # 面向开发者的中文门面
├── README.user.md            # 面向普通用户,由插件作者维护
├── README.en-US.md           # 英文版,与 README.md 同步维护
├── build.mjs                 # 构建入口
├── package.json              # 工程信息,meta.json 的数据来源
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── docs/                     # 文档索引、用户指南与设计记录
├── examples/
│   ├── README.md             # 示例索引
│   └── session-digest/
│       ├── index.ts          # 示例插件的激活与停用
│       └── manifest.ts       # 示例插件的清单
├── schemas/
│   ├── examples/             # Schema 的正例与反例
│   ├── manifest/
│   │   └── plugin-manifest.schema.json # 清单 schema
│   └── runtime/
│       └── meta.json         # runtime meta schema
├── scripts/
│   └── validate-specs.mjs    # 零依赖规范校验脚本
├── specs/                    # 规范区:运行时规范、开发规范、版本与 Schema
└── src/
    ├── index.ts              # 激活与停用入口
    ├── manifest.ts           # 运行时清单
    └── types.ts              # 契约类型
```

| 文件 | 作用 |
|:---:|:---:|
| `build.mjs` | 构建入口:打包、生成 `meta.json`、自校验、可选作者签名 |
| `package.json` | 工程信息与 `meta.json` 的数据来源 |
| `src/index.ts` | 激活与停用入口 |
| `src/manifest.ts` | 插件运行时清单,产物继续导出 |
| `src/types.ts` | 契约类型的精简副本 |
| `schemas/manifest/` | 清单 JSON Schema,与宿主的清单校验规则对齐 |
| `schemas/runtime/` | 运行时 meta 的 JSON Schema,构建自校验覆盖其中的必填与格式规则 |
| `scripts/validate-specs.mjs` | 零依赖校验脚本,校验 Schema、样例与本仓库 meta |
| `specs/` | 规范区:运行时规范、开发规范与版本信息 |
| `examples/session-digest/` | 先行示例插件,随类型检查一起验证 |
| `.env.example` | 环境变量模板 |
