# 规范与上游实现的对照

本仓库 specs 是 dsc 插件契约的收拢与机器可校验化,权威实现在 DeepSeek-Chat-Enhanced 的 `src/components/dsc-plugin-engine`。本文记录运行时规范与开发规范各章节对应的上游权威位置,以及实现与文档分歧时的裁决口径。规范与实现不一致时以实现为准,并在 [specs/README.md](../../specs/README.md) 的「已知差异」表留痕。

## 章节对照

| 规范章节 | 上游权威位置(DeepSeek-Chat-Enhanced) | 说明 |
|:---:|:---:|:---:|
| 运行时规范 1 产物形态、2 导出契约 | `src/components/dsc-plugin-engine/README.md`「运行时加载与跨源」、`loader.ts` | 体积常量与 Blob 加载口径在 loader |
| 运行时规范 3 生命周期与超时 | 同上 README「安装期校验」「生命周期」「依赖的四处生效」「冲突的保守处理」 | 安装不因冲突拒绝、依赖反向收敛等口径以此为准 |
| 运行时规范 4 能力与限流 | 同上 README「能力与限流」、`capabilities.ts` 的 POLICIES 策略表 | 限流与超时数值只在策略表维护,同步时先改表再改规范 |
| 运行时规范 5 上下文成员 | `capabilities.ts` 的能力封装、`../dsc-core/types.ts` | 上下文成员形态以 core 类型为准 |
| 运行时规范 5.4 插件数据、5.6 IndexedDB | 同上 README「隔离与降级」、`../dsc-core/plugin-data.ts` | 64KB 额度与键名规则在 core |
| 运行时规范 5.5 联网与外源请求 | 同上 README「net:fetch 的可见性」、`../dsc-core/net.ts` | 请求约束由 core 的 net 落实 |
| 运行时规范 5.7 资产读取与下载 | 同上 README「assets:read」、`assetAccess.ts`、`assetDownload.ts`;`assets:download` 的能力语义与受信来源层级以组织文档 `https://github.com/omds-chat/.github/blob/main/docs/repo-spec/asset-download-capability.md` 为唯一权威 | 组织文档管语义与层级,引擎实现管数值 |
| 运行时规范 5.8 请求前补丁 | 同上 README「请求前补丁」、`requestPatch.ts`、`../dsc-core/request-patch.ts` | 白名单、裁剪与合并只在引擎侧 requestPatch.ts 实现 |
| 运行时规范 5.9 插件设置表面 | 同上 README「插件设置表面」、`pluginSettings.ts`、`../dsc-core/plugin-settings.ts` | 字段形态与规模上限在引擎,覆盖层命名空间在 core |
| 运行时规范 5.10 UI 槽位 | 同上 README「插件 UI 槽位(ui:slot)」、`pluginSlots.ts` | 槽位枚举、白名单与描述校验都在引擎 |
| 运行时规范 5.11 供应端点与按端点执行 | 同上 README「供应端点能力与注册表」「按端点执行」、`sources.ts`、`providerRun.ts`、`../dsc-core/source-catalog.ts` | 端点描述与基址规范化在 core,注册表与凭证在引擎 |
| 运行时规范 7 错误与降级 | 同上 README「隔离与降级」与宿主错误表 | 用户可见文案键与宿主 i18n 配套 |
| 开发规范 2 清单 | 同上 README「清单」「安装期校验」、`registry.ts` 的 validateManifest | 校验顺序以 validateManifest 与 checkInstallable 为准 |
| 开发规范 3 版本与依赖 | `versionRange.ts`、同上 README「依赖的四处生效」 | 单段表达式判定共用一份实现 |
| 开发规范 4 运行时 meta | `localPackage.ts` 的 readPackageMeta、`../dsc-market/client.ts` 的 parseRuntimeMeta | 离线包最小校验与市场推导两条路径分别以此为准 |
| 开发规范 5 作者签名 | 同上 README「签名校验」、宿主 `docs/user/develop/basic/trust-chain.md` | 合集 CMS 与三层清单归上游 PKI 文档,本仓只写作者侧 |
| 开发规范 6 分发要求 | 同上 README「本地安装与离线包」、宿主 `docs/user/develop/basic/plugin-product-spec.md` | 预检顺序以 inspectPackageFiles 为准 |

## 残留口径

引擎的挂载点枚举 `MOUNT_POINTS` 含 `ui:slot-action` 与 `ui:slot-data`:它们是旧版「按挂载点声明槽位处理器」的残留,槽位处理器的授权已改由清单 `slots` 白名单逐槽位判定(`capabilities.ts` 的 `ensureSlotGranted`),声明这两个挂载点不产生授权效果。运行时规范 5.2 与开发规范 2.1 按此记述,不把它当独立功能。

## 裁决与同步

- 规范数值(限流、超时、体积、规模上限)以实现常量为唯一出处;同步时先改实现或策略表,再改规范与 Schema,最后升 `spec_version`。
- 上游文档(如 `plugin-product-spec.md`)对「模板规范尚未覆盖」的记述以本文与 [specs/README.md](../../specs/README.md) 的已知差异表为准核对;措辞滞后不改变规范内容,条目收敛后从差异表删除。
- 改动规范章节时,先核对上表对应的上游位置是否已变化,再动正文。
