# 示例插件

[session-digest](session-digest/index.ts) 是按 [插件开发规范](../specs/plugin-develop-spec.md) 与 [插件运行时规范](../specs/plugin-runtime-spec.md) 写的先行实现,覆盖规范里的关键点,并与模板源码一起通过 `pnpm run type`。

| 规范要点 | 代码位置 |
|:---:|:---:|
| 清单导出:必填字段、能力申请、挂载点声明 | [session-digest/manifest.ts](session-digest/manifest.ts) |
| 产物保留具名 `manifest` 与 `activate` 导出 | [session-digest/index.ts](session-digest/index.ts) |
| 激活与停用:异步入口、重复激活去重、返回值不传释放函数 | `activate` 与 `deactivate` |
| 依赖注入的上下文成员:`context.id`、`context.version`、`context.log` | `activate` 首段 |
| 能力申请:清单里申报 `sessions:read`、`sessions:list`、`events:session`、`notify`、`settings:locale`、`plugins:storage`;调用时的上下文成员分别是 `context.sessions.read`、`context.sessions.list`、`context.events.on`、`context.ui.notify`、`context.settings.locale`、`context.storage` | `handleSwitch`、`activate` |
| 取消与超时:传入 `signal`,按 `error.name` 判定 `PluginAbortError`、`PluginTimeoutError` | `errorNameOf`、`handleSwitch` |
| 插件数据:读回值形态收敛、写回失败只记日志 | `readState`、`writeState` |
| 用户可见文案使用宿主文案键 | `NOTICE_KEY` |

示例不被构建脚本打包:构建入口仍是 [src/index.ts](../src/index.ts),示例只用于类型检查与阅读。把它改成自己的插件时,复制两个文件,替换 `id`、`name`、`version` 与 `capabilities`,再把 `activate`、`deactivate` 与 `manifest` 转出到自己的入口即可。
