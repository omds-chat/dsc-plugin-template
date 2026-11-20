# dsc 插件运行时规范

本文件规定插件在宿主中的运行形态:产物如何加载、导出如何识别、生命周期与超时、能力与限流、上下文成员、安全边界与错误降级。

适用版本为 dsc-core 1.0.0,内容按 `dsc-plugin-engine` 的浏览器内实现收拢。实现与本文不一致时以实现为准,已知口径差异见 [规范区说明](README.md)。清单与运行时 meta 的字段规则见 [插件开发规范](plugin-develop-spec.md)。

## 1. 产物形态

| 项 | 规定 |
|:---:|:---:|
| 文件数量 | 单个 js 文件,分发时只交付这一个文件 |
| 模块格式 | 浏览器可直接 `import` 的 ESM;不得使用 `require`、Node 内置模块与打包器专用运行时占位 |
| 编码 | UTF-8 文本,必须能还原成原始字节;不是合法 UTF-8 时,在线安装结果为 `load-failed`,离线包预检结果为 `corrupt-package` |
| 体积上限 | 2 MB(2097152 字节);在线安装与本地离线包共用同一上限,超出按 `package-too-large` 拒绝 |
| 运行位置 | 页面主线程,可用浏览器 API,例如 `fetch`、`localStorage`、`setTimeout` |
| 不可用 | Node 内置模块、后端接口、本地文件系统、宿主 DOM 与插槽 |
| 依赖 | 不得新增运行依赖;第三方依赖内联进产物 |
| 资源 | 样式、字体与图片内联,或在代码里用绝对地址按需请求 |
| 存放与恢复 | 安装时取回字节,按 UTF-8 文本写入安装记录;加载时以 Blob 地址 `import`;启动恢复只用保存的代码,不访问网络 |

体积上限在宿主里是一个字节常量,提示文案里的 MB 数由该常量派生;调整上限时改常量,并同步本节数字。

产物以 Blob 地址加载,模块基址不是托管地址,因此 `import('./chunk.js')` 与 `new URL('./asset.png', import.meta.url)` 在安装后都无法解析,拆分代码与相对路径资源无效。

## 2. 导出契约

产物必须能被识别出插件对象,可以同时导出具名清单:

| 导出形态 | 说明 |
|:---:|:---:|
| `export const activate` | 模块本身即插件对象,`activate` 必填 |
| `export default` 插件对象 | 默认导出对象带 `activate` |
| `export default` 工厂 | 函数,返回插件对象或它的 Promise |
| 模块本身是工厂 | 模块是函数时按工厂调用 |
| `export const manifest` | 具名清单,未显式传入清单时的安装依据 |

清单优先级:调用方显式传入 > 模块顶层具名 `manifest` > `default` 导出对象上的 `manifest`。三者都没有时安装结果为 `invalid-manifest`,并提示 `pluginManifestMissing`。

插件对象只有两个成员:

| 成员 | 必填 | 说明 |
|:---:|:---:|:---:|
| `activate(context)` | 是 | 启动入口,可返回 Promise;返回值被忽略 |
| `deactivate()` | 否 | 停用入口,可返回 Promise;返回值被忽略 |

`activate` 的返回值不会被当作释放函数,释放统一走 `context.events.on` 返回的函数。产物没有可识别的 `activate` 时,安装结果为 `invalid-plugin`。

## 3. 生命周期与超时

| 状态 | 含义 |
|:---:|:---:|
| `registered` | 已登记,尚未启动 |
| `active` | 已激活,能力可用 |
| `inactive` | 已停用,贡献点与释放函数已撤销 |
| `failed` | 启动失败,原因写入插件日志与错误字段 |

| 操作 | 前置条件 | 超时 | 结果 |
|:---:|:---:|:---:|:---:|
| 安装 | 清单校验通过 | 模块导入 10 秒 | 登记为 `registered`;从地址与离线包安装成功后自动激活,宿主直接注册只登记;地址不合法、导入失败或导出不符为 `load-failed`、`invalid-plugin` |
| `activate` | 依赖插件均已 `active` | 5 秒 | `active`;抛错、超时或依赖未激活为 `failed` |
| `deactivate` | 状态为 `active` | 3 秒 | `inactive`;先调插件 `deactivate`,再执行释放函数并清空贡献点 |
| `unload` | 没有已激活的下游依赖 | — | 移除注册表与安装记录;有下游依赖时拒绝 |

- 同一插件的启停与卸载排队执行;对已 `active` 的插件再调 `activate` 直接返回成功。
- 激活抛错或超时:清空已注册的贡献点、执行释放函数,再标记 `failed`;引擎与其他插件继续运行。
- 停用抛错或超时:错误只写入该插件日志,仍执行释放函数、清空贡献点并置 `inactive`。
- 卸载不清除插件数据,返回值里的 `hasLeftoverData` 供界面提示清理入口。
- 启动恢复逐个插件隔离,单个插件失败只标记 `failed`,不阻塞其他插件与页面渲染。

## 4. 能力与限流

| 能力 | 上下文成员 | 限流 | 单次上限 | 可见范围 |
|:---:|:---:|:---:|:---:|:---:|
| `sessions:list` | `context.sessions.list` | 30 次 / 10 秒 | 3 秒 | 全部插件 |
| `sessions:read` | `context.sessions.read` | 30 次 / 10 秒 | 3 秒 | 全部插件 |
| `sessions:rename` | `context.sessions.rename` | 5 次 / 10 秒 | 同步调用 | 全部插件 |
| `events:session` | `context.events.on` | 5 次 / 10 秒 | 同步调用 | 全部插件 |
| `notify` | `context.ui.notify` | 10 次 / 10 秒 | 同步调用 | 全部插件 |
| `settings:locale` | `context.settings.locale` | 60 次 / 10 秒 | 3 秒 | 全部插件 |
| `plugins:storage` | `context.storage.get`、`set`、`remove` | 100 次 / 10 秒 | 同步调用 | 全部插件 |
| `net:fetch` | `context.net.getText` | 10 次 / 10 秒 | 内层 10 秒中止请求 | 仅内置插件 |

- 限流按插件实例独立计数,每个插件各有一份时间窗;`context.events.on` 每调用一次消耗 `events:session` 的一个名额。
- 两个能力标识只由引擎使用,插件清单不能申请,申请时按 `unknown-capability` 拒绝,也不会出现在上下文里:
  - `net:fetch-post`:`context.net.postJson` 背后的独立标识,有自己的限流窗口与 5 秒超时,复用 `net:fetch` 的授予口径,避免计数请求挤占读取预算。
  - `plugins:data-clear`:卸载清理专用,插件不可达。
- `net:fetch` 对第三方插件不可见:引擎维护内置插件 id 集合,集合外的清单申请它时,安装结果与申请不存在的能力完全一致,都是 `unknown-capability`;调用层会再校验一次,防止绕过安装校验直接拿到 `context.net`。

## 5. 上下文成员

| 成员 | 值 | 说明 |
|:---:|:---:|:---:|
| `context.id` | 插件 id | 与清单一致,只读 |
| `context.version` | 插件版本 | 与清单一致,只读 |
| `context.log(message)` | 无返回 | 写入该插件日志,上限 100 条,不写浏览器控制台 |
| `context.sessions.list(options?)` | `Promise<SessionSummary[]>` | 会话摘要只读视图 |
| `context.sessions.read(id, options?)` | `Promise<SessionView \| null>` | 会话内容只读视图,不存在时为 `null` |
| `context.sessions.rename(id, title)` | `boolean` | 同步调用 |
| `context.events.on(point, handler)` | 释放函数 | 订阅贡献点,释放函数由引擎执行 |
| `context.ui.notify(key, params?)` | 无返回 | 宿主提示,key 取自宿主 i18n 既有文案键 |
| `context.settings.locale(options?)` | `Promise<'zh-CN' \| 'en-US'>` | 当前语言 |
| `context.storage.get(key)` | `unknown` | 缺失的键返回 `null` |
| `context.storage.set(key, value)` | 无返回 | 值须可 JSON 序列化 |
| `context.storage.remove(key)` | 无返回 | 键不存在时不报错 |
| `context.net.getText(url, options?)` | `Promise<{ url, contentType, text }>` | 仅内置插件 |
| `context.net.postJson(url, body, options?)` | `Promise<{ url, status }>` | 仅内置插件 |

`options` 为 `{ signal?: AbortSignal }`,用于取消异步调用;取消抛 `PluginAbortError`。异步能力单次超时 3 秒,超时抛 `PluginTimeoutError`;`net:fetch` 的内层 10 秒中止与 `postJson` 的 5 秒中止见 5.5 节。

### 5.1 可见数据范围

| 数据 | 可见字段 |
|:---:|:---:|
| 会话摘要 | `id`、`title`、`createdAt`、`updatedAt` |
| 会话内容 | 摘要字段与 `messages`;消息含 `id`、`role`、`createdAt`、`text`、`attachments`,附件含 `name`、`size`、`isImage` |
| 事件 | `session:changed` 与当前会话 `activeId` |
| 设置 | 当前语言 |
| 插件数据 | 该插件自己写入的键值,读写按插件 id 隔离 |

不可见:API Key、附件的本地 id 与服务端 file_id、附件原件、请求快照、分支内部结构、其他插件的本地数据、请求 Cookie。

### 5.2 事件与贡献点

- 只有清单声明了 `session:changed` 才能调用 `context.events.on('session:changed', handler)`,否则抛 `PluginCapabilityError`。
- `on` 返回释放函数;引擎在停用、卸载与激活失败时自动执行,插件不要重复调用。
- 处理器逐个插件、逐个隔离:同步抛错与异步拒绝都只写入该插件日志,不影响其他处理器。

### 5.3 提示与设置

- `notify` 的 `key` 取自宿主 i18n 的既有键,插件不拼接文案,也不硬编码中英文句子。
- `locale` 返回当前语言,用于插件内部选择分支。

### 5.4 插件数据

| 项 | 规定 |
|:---:|:---:|
| 存储位置 | 浏览器 localStorage,键为 `<APP_NAME>:plugin-data:<插件 id>` |
| 单插件总量 | 上限 64KB,超出抛 `PluginDataError`,原因为 `quota` |
| 键名 | 非空字符串,长度不超过 64 |
| 值 | 必须可 JSON 序列化;含函数、`undefined`、循环引用时抛 `PluginDataError`,原因为 `serialize` |
| 缺失键 | `get` 返回 `null` |
| 生命周期 | 卸载不清除;随站点数据清除而丢失,不得当作可靠存储或密钥保管处 |

### 5.5 外源请求

`net:fetch` 只对内置插件开放,调用方仍需在清单里申请它;请求约束由宿主落实:

| 方法 | 约束 |
|:---:|:---:|
| `getText(url, options?)` | 仅 https 与 GET;不发送 Cookie 与自定义请求头;只接受 `text/*` 与 `application/json` 响应;响应体上限 512KB;10 秒后中止请求 |
| `postJson(url, body, options?)` | 仅 https 与 JSON 请求体;请求体与响应体上限各 4KB;5 秒后中止;不跟随重定向;响应体丢弃,只回传最终地址与状态码 |

失败时抛 `PluginFetchError`,`reason` 取 `url`、`protocol`、`timeout`、`aborted`、`status`、`content-type`、`too-large`、`body`、`redirect`、`network` 之一;网络与解析失败由插件自行降级,引擎不弹宿主提示。

## 6. 安全边界

- 唯一通道:插件与宿主之间只有 `context` 上的受限能力对象。插件拿不到 `dsc-core` 的 `CoreApi`、`zustand` store 句柄与 IndexedDB 句柄,也拿不到任何 DOM 或插槽接口。
- 凭证与票据:引擎持有调用凭证,每次调用签发一张一次性票据,票据有效期 5 秒,核心消费后作废。绕过 `context` 直接调用核心会因缺少票据被拒,引擎记录旁路事件(保留 50 条),并按 3 秒的最小间隔提示 `pluginBypassDetected`。
- 能力双层校验:安装时按清单校验能力与贡献点,调用时按清单再校验一次;未申请的能力不可用。
- 数据隔离:插件数据按插件 id 隔离,只能读写自己的键值。
- 日志隔离:插件日志保存在内存,单插件上限 100 条,经面板或引擎接口读取,不写浏览器控制台。
- 文案约束:用户可见提示复用宿主文案键,插件不自造文案。

## 7. 错误与降级

| 情形 | 行为 |
|:---:|:---:|
| 清单非法 | 安装拒绝,`invalid-manifest` |
| 能力或贡献点未知 | 安装拒绝,`unknown-capability` 或 `unknown-contribution` |
| 版本不兼容 | 安装拒绝,`incompatible-version` |
| 重名、缺依赖、冲突 | 安装拒绝,`duplicate`、`missing-dependency`、`conflict` |
| 产物字节取不到 | 安装拒绝,`artifact-unreachable` |
| 产物不是可存的 UTF-8 文本 | 安装拒绝:在线安装 `load-failed`,离线包预检 `corrupt-package` |
| 产物无法导入或导出不符 | 安装拒绝,`load-failed` 或 `invalid-plugin` |
| 激活抛错或超时 | 插件标记 `failed`,引擎与其他插件继续运行 |
| 未授予的能力被调用 | 抛 `PluginCapabilityError`,并提示 `pluginCapabilityDenied` |
| 超出限流 | 抛 `PluginRateLimitError`,并提示 `pluginCallRateLimited` |
| 调用超时 | 抛 `PluginTimeoutError`,并提示 `pluginCallTimeout` |
| 调用被取消 | 抛 `PluginAbortError` |
| 事件处理器抛错 | 只写入该插件日志,不影响其他处理器 |
| 插件数据超限或无法序列化 | 抛 `PluginDataError`,并提示 `pluginDataQuotaExceeded`、`pluginDataUnavailable` 或 `pluginDataInvalid` |

## 8. 校验方式

| 文档 | Schema |
|:---:|:---:|
| 插件清单 | [schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) |
| 运行时 meta | [schemas/runtime/meta.json](../schemas/runtime/meta.json) |

本仓库提供零依赖校验脚本,不联网、不安装依赖:

```bash
node scripts/validate-specs.mjs                          # 自检 Schema、样例与本仓库 meta 数据
node scripts/validate-specs.mjs <清单文件>                # 校验单个清单
node scripts/validate-specs.mjs <meta.json> --schema meta # 校验单个运行时 meta
```

Schema 是静态校验,最终以宿主安装时的校验结果为准。清单 Schema 未列出的字段会被拒绝,宿主的清单读取只取已定义的字段并忽略其余字段,因此 Schema 只用于尽早发现拼写与取值错误,不改变宿主的判定。

## 历史版本列表

本文档只维护最新版本,历史版本由本节的链接负责导航。

本节为占位:仓库当前还没有发布标签,首个版本发布后在此按版本倒序列出,每个条目指向该版本标签下的本文档。
