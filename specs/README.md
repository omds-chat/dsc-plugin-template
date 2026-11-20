# dsc 插件规范区

本目录与 [schemas/](../schemas/runtime/meta.json) 一起收拢 dsc 插件的运行时规范、开发规范、JSON Schema 与先行实现。规范内容来自 DeepSeek-Chat-Enhanced 的 `dsc-plugin-engine` 实现与其开发文档,本仓库只做收拢、机器可校验化与示例实现,不新增规则。

## 内容

| 文件 | 内容 |
|:---:|:---:|
| [plugin-runtime-spec.md](plugin-runtime-spec.md) | 运行时规范:产物形态、导出契约、生命周期与超时、能力与限流、上下文成员、安全边界、错误降级 |
| [plugin-develop-spec.md](plugin-develop-spec.md) | 开发规范:清单字段与校验、版本与依赖、运行时 meta、作者签名与公钥位置、分发要求 |
| [spec-version.json](spec-version.json) | 规范版本与 Schema 路径,供其他仓库引用时锁定 |
| [../schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) | 清单 Schema |
| [../schemas/runtime/meta.json](../schemas/runtime/meta.json) | 运行时 meta Schema |
| [../schemas/examples/manifest.valid.json](../schemas/examples/manifest.valid.json) | Schema 的通过样例与反例 |
| [../examples/session-digest/index.ts](../examples/session-digest/index.ts) | 先行代码实现:清单导出、激活与停用、能力申请 |
| [../scripts/validate-specs.mjs](../scripts/validate-specs.mjs) | 零依赖校验脚本 |

## 权威来源与引用约定

- 权威来源是 `dsc-plugin-engine` 的实现:清单校验、能力表、限流、加载与签名都以实现为准;实现与文档不一致时以实现为准,并在「已知差异」里保留两侧口径。
- 其他仓库引用本规范时,按 `spec_version` 选定版本,再用 git 标签或提交固定,不要在文档里引用浮动分支;Schema 路径以 [spec-version.json](spec-version.json) 的 `schemas` 字段为准。
- 上游实现变更后,先改本目录的规范与 Schema,再升 `spec_version`,最后同步引用方;`dsc_core` 字段记录对应的宿主版本。

## 校验

```bash
node scripts/validate-specs.mjs                          # 自检 Schema、样例与本仓库 meta 数据
node scripts/validate-specs.mjs <清单文件>                # 校验单个清单
node scripts/validate-specs.mjs <meta.json> --schema meta # 校验单个运行时 meta
```

脚本只用 Node 内置模块,不联网、不安装依赖。自检覆盖:规范版本与 Schema 路径一致、Schema 结构可用、正例通过、反例被拒绝、`package.json` 派生的 meta 通过运行时 meta Schema。若磁盘上存在构建产出的 `meta.json`,也会一并校验。

## 已知差异

以下差异来自上游文档与实现的对照,本规范按实现取舍并在此留痕,不修改上游文档:

| 主题 | 上游文档口径 | 实现口径 | 本规范取舍 |
|:---:|:---:|:---:|:---:|
| `meta.json.author.sig` | 插件开发规范与产物规范把它列为作者签名产物,并称安装与启动时校验 | 引擎只验 `plugin.js.author.sig`;`meta.json` 的完整性由合集三层哈希清单覆盖,本仓库构建不产出该文件 | 只收 `plugin.js.author.sig` |
| 1 MB 上限的适用范围 | 产物规范写在「本地离线包」一节 | 在线安装与离线包共用同一上限,在线超限同样按 `package-too-large` 拒绝 | 按实现写成在线与离线同一上限 |
| `context.id` 与 `context.version` | 上游三份文档(产物规范、开发规范、引擎说明)的上下文成员表都没有列出 | 引擎注入的上下文包含这两个只读成员 | 列为上下文成员 |
| 清单 id 的收敛长度 | 收敛实现只要求小写字母开头、只含小写字母数字与连字符,不限长度 | 清单校验要求 3 到 64 字符,1 到 2 字符的收敛结果会在安装时被拒 | 要求两处同时满足 |
| 版本范围的写法 | 运行时 meta 的 `dependencies.dsc` 描述为 semver range,允许组合范围 | 清单 `engines` 只接受单段比较表达式;离线包由 `meta.json` 推导清单时,`dependencies.dsc` 会直接当作 `engines`,组合范围会按 `incompatible-version` 拒绝 | 两个字段分别说明,并提示 `dependencies.dsc` 也要写成单段表达式 |

## 语言

规范正文以中文维护,与上游文档语言一致;仓库根目录的 `README.md` 与 `README.en-US.md` 保持中英两版同步。
