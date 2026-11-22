# 清单编写指南

清单写在 [src/manifest.ts](../../../src/manifest.ts),由 [src/index.ts](../../../src/index.ts) 转出为具名导出,安装时以产物自带的 `manifest` 为准。字段与校验规则的完整条文见[插件开发规范](../../../specs/plugin-develop-spec.md) 2,本文只给写法与注意事项;清单取值可用 `node scripts/validate-specs.mjs <清单文件>` 校验。

## 字段

| 字段 | 必填 | 说明 |
|:---:|:---:|:---:|
| `id` | 是 | 插件标识,须匹配 `^[a-z][a-z0-9-]{2,63}$`,仓库约定以 `dsc-` 开头 |
| `name` | 是 | 展示名称,不得为空 |
| `version` | 是 | 插件自身版本,只允许三段数字,例如 `0.1.0` |
| `engines` | 否 | 兼容的 dsc-core 版本范围,支持 `^`、`~`、`>=`、`<=` 与精确版本 |
| `dependencies` | 否 | 依赖的插件 id,安装时须已存在,激活时须已激活 |
| `conflicts` | 否 | 冲突的插件 id;安装不因冲突被拒绝,检出与处置见运行时规范 3 |
| `capabilities` | 是 | 申请的能力,不得重复,取值见下节能力表 |
| `mounts` | 否 | 订阅的挂载点,可选值为 `session:changed`、`chat:before-request` |
| `slots` | 否 | 申请能力 `ui:slot` 时逐槽位声明的白名单,见开发规范 2.5 |
| `assets` | 否 | 申请能力 `assets:download` 时的资产声明块,见开发规范 2.6 |

注意事项:

- `id` 全局唯一,重复安装会被拒绝。
- `version` 是插件版本,与 `package.json` 中的版本无关。
- `capabilities` 只写能力表内的名字,未知或重复的能力会让安装被拒绝。
- `mounts` 只写挂载点表内的名字,重复声明会让安装被拒绝;未知挂载点由引擎拒绝,错误码为 `unknown-mount`。
- 契约以 DeepSeek-Chat-Enhanced 源码为准;`src/types.ts` 只覆盖模板用到的字段,缺的字段请查源码。

## 能力

| 能力 | 申请条件 | 上下文成员 |
|:---:|:---:|:---:|
| `sessions:list` | 无 | `context.sessions.list` |
| `sessions:read` | 无 | `context.sessions.read` |
| `sessions:rename` | 无 | `context.sessions.rename` |
| `events:session` | 无 | `context.events.on` |
| `notify` | 无 | `context.ui.notify` |
| `settings:locale` | 无 | `context.settings.locale` |
| `settings:surface` | 无 | `context.settings.register`、`values`、`overrides`、`onChange` |
| `ui:slot` | 清单同时声明 `slots` 白名单 | `context.ui.registerSlot`、`onSlotAction`、`onSlotData` |
| `plugins:storage` | 无 | `context.storage` |
| `chat:request` | 清单同时声明挂载点 `chat:before-request` | `context.chat.onBeforeRequest` |
| `provider:source` | 无 | `context.provider.registerSource` |
| `provider:run` | 无 | `context.provider.run` |
| `assets:read` | 无 | `context.assets.readText`、`readBytes` |
| `assets:download` | 仅受信来源插件;清单同时声明 `assets` 块 | `context.assets.download` |
| `net:fetch` | 仅内置插件,第三方申请按 `unknown-capability` 拒绝 | `context.net.getText`、`postJson` |

各能力的限流、超时与申请条件的完整条文见[运行时规范](../../../specs/plugin-runtime-spec.md) 4。

联网受引擎管控:插件不得自行调用全局 `fetch`、`XMLHttpRequest`、`WebSocket` 等网络接口取数据,联网必须走宿主提供的网络能力。插件与宿主同源、跑在页面主线程,引擎无法在技术上阻止插件直接调用全局 `fetch`,所以这是一条契约约束而非沙箱拦截:违反属于不合规,会在收录审核与运行日志里被指出。细则见[运行时规范](../../../specs/plugin-runtime-spec.md) 5.5。

其他要点:

- 限流按插件实例独立计数,窗口统一为 10 秒;`events:session` 等「仅登记」能力按登记次数计。
- `plugins:storage` 的 64KB 是整个插件全部键值的合计,不按单个键计算;键名上限 64 个字符。资产快照、缓存这类大体积数据改存浏览器的 IndexedDB,细则见[运行时规范](../../../specs/plugin-runtime-spec.md) 5.4 与 5.6。
- 模板默认申请 `events:session` 与 `notify` 两项能力,只订阅 `session:changed` 一个挂载点。
