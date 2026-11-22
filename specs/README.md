# dsc 插件规范区

本目录与 [schemas/](../schemas/runtime/meta.json) 一起收拢 dsc 插件的运行时规范、开发规范、JSON Schema 与先行实现。规范内容来自 DeepSeek-Chat-Enhanced 的 `dsc-plugin-engine` 实现与其开发文档,本仓库只做收拢、机器可校验化与示例实现,不新增规则;唯一例外是插件联网口径(见下节「权威来源与引用约定」),那是产品裁定,不是对实现的记述。

## 内容

| 文件 | 内容 |
|:---:|:---:|
| [plugin-runtime-spec.md](plugin-runtime-spec.md) | 运行时规范:产物形态与体积上限、导出契约、生命周期与超时、能力与限流、上下文成员(可见范围、事件、提示与设置、插件数据、大体积数据与 IndexedDB、联网与外源请求、资产读取与下载、请求前补丁、插件设置表面、UI 槽位、供应端点与按端点执行)、安全边界、错误降级 |
| [plugin-develop-spec.md](plugin-develop-spec.md) | 开发规范:清单字段与校验、UI 槽位白名单、资产声明块、版本与依赖、运行时 meta、作者签名与公钥位置、分发要求 |
| [spec-version.json](spec-version.json) | 规范版本与 Schema 路径,供其他仓库引用时锁定 |
| [../schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) | 清单 Schema |
| [../schemas/runtime/meta.json](../schemas/runtime/meta.json) | 运行时 meta Schema |
| [../schemas/examples/manifest.valid.json](../schemas/examples/manifest.valid.json) | Schema 的通过样例与反例 |
| [../examples/session-digest/index.ts](../examples/session-digest/index.ts) | 先行代码实现:清单导出、激活与停用、能力申请 |
| [../scripts/validate-specs.mjs](../scripts/validate-specs.mjs) | 零依赖校验脚本 |

## 权威来源与引用约定

- 权威来源是 `dsc-plugin-engine` 的实现:清单校验、能力表、限流、加载与签名都以实现为准;实现与文档不一致时以实现为准,并在「已知差异」里保留两侧口径。
- 其他仓库引用本规范时,按 `spec_version` 选定版本,并在自身依赖里固定到具体标签或提交;文档内的链接一律指向最新文件,不在链接 URL 里写死标签名,历史版本由每份规范末尾的「历史版本列表」导航。Schema 路径以 [spec-version.json](spec-version.json) 的 `schemas` 字段为准。
- 上游实现变更后,先改本目录的规范与 Schema,再升 `spec_version`,最后同步引用方;`dsc_core` 字段记录对应的宿主版本。
- 本仓库是插件运行时规范、插件开发规范、JSON Schema 与示例的唯一源头:其他仓库不复制规范正文,只保留一段占位说明与指向本仓库的在线链接。
- 跨仓库引用一律用在线 URL,形如 `https://github.com/omds-chat/dsc-plugin-template/blob/main/specs/plugin-runtime-spec.md`,不写相对路径。相对路径只在发出链接的仓库里成立,到了引用方仓库会指向错误位置,克隆、镜像与离线阅读都会失效。
- 本仓库内部互相引用时才用相对路径,便于本地预览与链接检查;本仓库引用其他仓库的文档同样用在线 URL,不写 `../其他仓库/...`。
- 插件联网采用产品裁定:插件联网必须受插件引擎管控,由引擎暴露的接口提供联网能力,细则见[运行时规范](plugin-runtime-spec.md) 5.5。该条不是对 `dsc-plugin-engine` 现有行为的记述:插件与宿主同源、跑在页面主线程,引擎在技术上无法阻止插件调用全局 `fetch`,因此按契约约束写入,违反属于不合规,会在收录审核与运行日志里被指出。它也不是「上游文档与实现不一致」,所以不列入下文「已知差异」表。
- `assets:download` 的能力语义与受信来源层级由组织文档维护,本仓库只收拢插件可见口径,见[运行时规范](plugin-runtime-spec.md) 5.7:`https://github.com/omds-chat/.github/blob/main/docs/repo-spec/asset-download-capability.md`。

## 校验

```bash
node scripts/validate-specs.mjs                          # 自检 Schema、样例与本仓库 meta 数据
node scripts/validate-specs.mjs <清单文件>                # 校验单个清单
node scripts/validate-specs.mjs <meta.json> --schema meta # 校验单个运行时 meta
```

脚本只用 Node 内置模块,不联网、不安装依赖。自检覆盖:规范版本与 Schema 路径一致、Schema 结构可用、正例通过、反例被拒绝、`package.json` 派生的 meta 通过运行时 meta Schema。若磁盘上存在构建产出的 `meta.json`,也会一并校验。

## 已知差异

以下差异来自上游文档、Schema 与实现的对照,本规范按实现取舍并在此留痕,不修改上游文档。本表只保留当前仍然成立的条目:已经收敛的差异直接删除,不留历史,每行的「本规范取舍」都对应正文里的具体章节。上游文件指 DeepSeek-Chat-Enhanced 的 `docs/user/develop/basic/plugin-product-spec.md`,行号为当前正文位置。

| 主题 | 上游文档口径 | 实现口径 | 本规范取舍 |
|:---:|:---:|:---:|:---:|
| 请求前补丁的收录状态 | plugin-product-spec.md:35 写「模板规范尚未覆盖,补丁字段、范围裁剪与合并规则由本仓库引擎实现界定」 | 白名单、范围裁剪、合并与 10 毫秒预算都已在引擎实现,模板规范已按实现收录为 [运行时规范](plugin-runtime-spec.md) 5.8 | 按 5.8 收录;上游该行的「模板规范尚未覆盖」措辞待上游更新 |
| 资产读取的收录状态 | plugin-product-spec.md:36 写「模板规范尚未覆盖;三态口径、体积与超时上限、去重提示都由本仓库实现界定」 | 三态结果、512KB 上限、10 秒超时与「插件 + 来源」去重提示都已在引擎实现,模板规范已按实现收录为 [运行时规范](plugin-runtime-spec.md) 5.7 | 按 5.7 收录;上游措辞待上游更新 |
| 供应端点的收录状态 | plugin-product-spec.md:37 写「模板规范尚未覆盖;端点描述的字段、基址规范化、合并与冲突口径、凭证约束都由本仓库的引擎与内核实现界定」 | 端点描述、基址规范化、注册表合并与冲突、按端点执行都已在引擎与内核实现,模板规范已按实现收录为 [运行时规范](plugin-runtime-spec.md) 5.11 | 按 5.11 收录;上游措辞待上游更新 |
| 插件设置表面的收录状态 | plugin-product-spec.md:38 写「模板规范尚未覆盖;字段描述的形态与校验、默认层与覆盖层的值语义、secret 走凭证库、宿主渲染与脏值生命周期都由本仓库的引擎实现界定」 | 字段描述五种类型、规模上限、覆盖层命名空间与 secret 凭证库都已在引擎实现,模板规范已按实现收录为 [运行时规范](plugin-runtime-spec.md) 5.9 | 按 5.9 收录;上游措辞待上游更新 |
| 插件 UI 槽位的收录状态 | plugin-product-spec.md:39 写「模板规范尚未覆盖;槽位枚举与白名单、页面描述的形态与校验、四种区块、动作回调与页面数据处理器都由本仓库的引擎实现界定」 | 十槽位枚举、`slots` 白名单、页面与位置描述、区块与两个回调都已在引擎实现,模板规范已按实现收录为 [运行时规范](plugin-runtime-spec.md) 5.10 | 按 5.10 收录;上游措辞待上游更新 |
| 离线包预检里体积检查的位置 | 引擎说明与用户指南的预检表把「`plugin.js` 不超过 2 MB」列在 `meta.json` 解析与 UTF-8 检查之后 | 取到 `plugin.js` 后立即比对体积,早于 `meta.json` 解码与解析;体积与清单同时不合规时报 `package-too-large` | 按实现排序,写进 [开发规范](plugin-develop-spec.md) 6.2 |
| `meta.json` 的 UTF-8 要求 | 预检表只写「可解析」「`name`、`version`、`author` 非空」「版本为三段数字」 | 先按严格 UTF-8 解码,非法字节序列按 `invalid-meta` 拒绝,不会进入字段校验 | 写进 [开发规范](plugin-develop-spec.md) 4 与 6.2 的 `invalid-meta` 口径 |
| `meta.json` 的 `description` 形态 | 运行时 meta Schema 与[开发规范](plugin-develop-spec.md) 4 要求 `description` 为双语对象,至少含 `zh-CN` 或 `en-US` 一项 | 引擎接受字符串形式的 `description`,两种语言按同一内容处理;字段缺失也不拒绝,按空串处理 | Schema 与引擎分开写:Schema 从严,引擎的最小校验单独列出 |
| `meta.json` 的 `mounts` | 引擎用户指南写「`meta.json` 写了 `mounts` 就原样带进清单」 | 离线包预检只取 `capabilities` 与 `dependencies.dsc`,不读 `mounts`;市场解析 `meta.json` 时读它并写进清单的 `mounts`,缺省时由产物导出的清单补齐 | 按实现分别记述两条安装路径,写进[开发规范](plugin-develop-spec.md) 4 |
| `meta.json` 的 `slots` | 上游文档未记述 `slots` 在 `meta.json` 里的读法 | 与 `mounts` 同法:市场推导清单时读它并写进清单的 `slots`,离线包预检不读,缺省时由产物导出的清单补齐 | 写进 [开发规范](plugin-develop-spec.md) 4 与 [运行时 meta Schema](../schemas/runtime/meta.json) |
| `meta.json` 的 `conflicts` | 上游只在清单层描述 `conflicts`,清单与用户指南都把它当作清单字段 | 由 `meta.json` 推导清单的两条路径都不读 `conflicts`,该字段不影响安装结果 | Schema 里保留该字段并标注「预留,引擎当前不读」,写进[开发规范](plugin-develop-spec.md) 4 |
| 版本范围的写法 | 运行时 meta Schema 把 `dependencies.dsc` 描述为 semver range,`>=1.0.0 <2.0.0` 这类组合范围也能通过 Schema | 清单 `engines` 与离线包的 `dependencies.dsc` 都只接受单段比较表达式;组合范围在离线包预检阶段按 `invalid-meta` 拒绝,清单侧的 `engines` 才按 `incompatible-version` 拒绝 | 两个字段分别说明,并提示 `dependencies.dsc` 也要写成单段表达式 |
| 带 `=` 前缀的精确版本 | 版本范围只写「支持 `^`、`~`、`>=`、`<=` 与精确版本」,未提等号前缀 | 范围规则接受 `=1.0.0`,与 `1.0.0` 等价,按三段数字比较 | [开发规范](plugin-develop-spec.md) 3 补上 `=` |
| 安装期冲突的处置 | plugin-product-spec.md:273 的错误表已写「安装不拒绝,始终成功并发出警告气泡」,但模板规范旧版写「任一已安装即拒绝」 | 实现不因冲突拒绝安装:两个方向检出后,对方在启用中时新插件保持停用并写入待决定记录,对方全部停用时仅警告 | 按实现记述,写进 [开发规范](plugin-develop-spec.md) 2.1、2.2 与 [运行时规范](plugin-runtime-spec.md) 3、7 |

## 语言

规范正文以中文维护,与上游文档语言一致;仓库根目录的 `README.md` 与 `README.en-US.md` 保持中英两版同步。

## 历史版本列表

本文档只维护最新版本,历史版本由本节的链接负责导航。

本节为占位:仓库当前还没有发布标签,首个版本发布后在此按版本倒序列出,每个条目指向该版本标签下的本文档。
