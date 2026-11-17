# dsc-plugin-template

[简体中文] | [English](README.en-US.md)

dsc 插件开发模板：用 TypeScript 编写源码,用 esbuild 打包成单个浏览器 ESM 文件,产物可以直接在 dsc 中从地址安装。

## 模板用途

本模板提供一个能直接跑通的最小插件工程,包含：

- 一份可运行的插件清单与生命周期入口
- 一份契约类型的本地副本,脱离 DeepSeek-Chat-Enhanced 源码也能获得类型提示
- 一套 TypeScript 与 esbuild 的构建配置,产物固定为单文件

模板本身不做业务,只演示插件与宿主之间的最小交互：订阅会话切换事件、写插件日志、用宿主文案键提示一次。

## 目录结构

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

| 文件 | 作用 |
|:---:|:---:|
| `package.json` | 工程信息、脚本与开发依赖 |
| `pnpm-lock.yaml` | `pnpm install` 生成的依赖锁定文件,建议随仓库提交 |
| `pnpm-workspace.yaml` | pnpm 12 的设置文件,声明允许 esbuild 执行安装脚本 |
| `build.mjs` | esbuild 打包脚本,输出 `dist/plugin.js` |
| `tsconfig.json` | TypeScript 严格模式配置,只做类型检查不产出文件 |
| `src/manifest.ts` | 插件清单 |
| `src/index.ts` | 激活与停用入口 |
| `src/types.ts` | 插件契约的精简类型声明 |

## 环境要求

| 项 | 要求 |
|:---:|:---:|
| Node.js | 18 或更高版本 |
| pnpm | 12 或更高版本 |
| 产物目标浏览器 | Chrome 105、Edge 105、Safari 16、Firefox 110 |

pnpm 12 默认不执行依赖的安装脚本,仓库里的 pnpm-workspace.yaml 通过 allowBuilds 显式允许 esbuild 的构建脚本,请不要删除这个文件。

## 快速开始

```bash
git clone https://github.com/omdsc-dev/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

产物为 `dist/plugin.js`。构建脚本会先清空 `dist/`,打包后校验其中只有一个 js 文件,并打印产物路径与体积。

| 命令 | 作用 |
|:---:|:---:|
| `pnpm install` | 安装开发依赖 |
| `pnpm run type` | 运行 `tsc --noEmit` 做类型检查 |
| `pnpm run build` | 打包产物并打印路径与体积 |

## 如何把产物装进 DeepSeek-Chat-Enhanced

1. 用本机静态服务器提供 `dist/plugin.js`,例如 `http://localhost:8090/plugin.js`。
2. 点击侧边栏底部的「插件」按钮,打开插件面板。
3. 在面板底部的「从地址安装」输入框中粘贴产物地址,点击「安装」。
4. 安装成功后插件自动激活,「已安装」中的状态显示为「运行中」。
5. 点击「查看日志」可以看到 `context.log` 写入的内容,切换会话后日志会追加一条。

地址规则：分发给用户时使用 `https://` 地址。本机调试时 DeepSeek-Chat-Enhanced 允许 `http://localhost`、`http://127.0.0.1` 与 `http://[::1]`,其余地址必须是 `https://`。

产物改动后需要先在面板卸载再重新安装,同一地址的模块会被浏览器缓存。

## 如何改 manifest

清单写在 [src/manifest.ts](src/manifest.ts),由 [src/index.ts](src/index.ts) 转出为具名导出,安装时以产物自带的 `manifest` 为准。

| 字段 | 必填 | 说明 |
|:---:|:---:|:---:|
| `id` | 是 | 插件标识,须匹配 `^[a-z][a-z0-9-]{2,63}$`,仓库约定以 `dsc-` 开头 |
| `name` | 是 | 展示名称,不得为空 |
| `version` | 是 | 插件自身版本,只允许三段数字,例如 `0.1.0` |
| `engines` | 否 | 兼容的 dsc-core 版本范围,支持 `^`、`~`、`>=`、`<=` 与精确版本 |
| `dependencies` | 否 | 依赖的插件 id,安装时须已存在,激活时须已激活 |
| `conflicts` | 否 | 冲突的插件 id,同时安装会被拒绝 |
| `capabilities` | 是 | 申请的能力,不得重复 |
| `contributions` | 否 | 订阅的贡献点,当前只有 `session:changed` |

改清单时的注意事项：

- `id` 全局唯一,重复安装会被拒绝。
- `version` 是插件版本,与模板 `package.json` 中的版本无关。
- `capabilities` 只写能力表内的名字,未知或重复的能力会让安装被拒绝。
- 契约速查见组织内的 `.agents/dsc-plugin-contract.md`,若与 DeepSeek-Chat-Enhanced 源码冲突以源码为准。

## 能力清单

| 能力 | 上下文成员 | 限流 |
|:---:|:---:|:---:|
| `sessions:list` | `context.sessions.list` | 30 次 / 10 秒 |
| `sessions:read` | `context.sessions.read` | 30 次 / 10 秒 |
| `sessions:rename` | `context.sessions.rename` | 5 次 / 10 秒 |
| `events:session` | `context.events.on` | 5 次 / 10 秒 |
| `notify` | `context.ui.notify` | 10 次 / 10 秒 |
| `settings:locale` | `context.settings.locale` | 60 次 / 10 秒 |
| `plugins:storage` | `context.storage` | 100 次 / 10 秒,单插件 64KB |

`net:fetch` 只对内置插件开放,第三方插件在清单里写它会被当作未知能力拒绝。

模板默认申请 `events:session` 与 `notify` 两项能力,只订阅 `session:changed` 一个贡献点。

## 发布与分发建议

- 产物文件名带上插件 id 与版本号,例如 `dsc-demo-log-0.1.0.js`,便于用户区分版本。
- 产物托管在支持 `https` 的静态站点或 CDN 上,保持地址稳定;地址失效会让已安装插件显示为「启动失败」。
- 发布前在浏览器控制台执行一次 `import('https://你的地址/dsc-demo-log-0.1.0.js')`,确认没有语法错误与缺失依赖。
- `dist/` 由构建产生并已在 `.gitignore` 中忽略,需要交付产物时在 Release 中附带。
- 插件运行在用户浏览器中,可以接触 API Key 与当前会话内容,分发时必须提示用户只安装信任来源的插件。
- 收录到插件市场时,产物仍须导出 `manifest`,或由市场索引条目内联清单。

## 常见问题

### 产物不是单文件

`build.mjs` 已关闭代码分割、清空 `dist/`,并在打包后校验其中只有 `plugin.js`。若仍出现额外文件,检查源码里是否用了动态 `import()`,或引入了需要单独输出的资源。

### 清单缺失

安装结果为 `invalid-manifest`,宿主提示 `pluginManifestMissing`,通常是产物没有导出 `manifest`。确认 [src/index.ts](src/index.ts) 保留了 `export { manifest } from './manifest.js'`,并且 `build.mjs` 的入口仍是 `src/index.ts`。

### 版本不兼容

安装结果为 `incompatible-version`,说明 `engines` 与宿主 dsc-core 版本不匹配。当前宿主为 `1.0.0`,模板使用 `^1.0.0`;宿主主版本变化时按需调整 `engines`。

## 许可证

[Apache-2.0](LICENSE)。
