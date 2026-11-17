/**
 * dsc 插件契约的精简类型声明。
 *
 * 这份声明是契约的本地副本,只覆盖模板用到的字段与能力对象。
 * 若与 DeepSeek-Chat-Enhanced 源码不一致,以该源码为准。
 * 契约速查：.agents/dsc-plugin-contract.md(组织内只读文件)。
 */

/** 清单中的能力名,取值来自引擎的能力表 */
export type DscCapability =
  | 'sessions:list'
  | 'sessions:read'
  | 'sessions:rename'
  | 'events:session'
  | 'notify'
  | 'settings:locale'
  | 'plugins:storage'
  | 'net:fetch'

/** 贡献点,当前只实现了 session:changed */
export type DscContribution = 'session:changed'

/**
 * 插件清单。
 * id 须匹配 ^[a-z][a-z0-9-]{2,63}$,version 为三段数字,capabilities 不得重复。
 */
export interface PluginManifest {
  id: string
  name: string
  version: string
  /** 兼容的 dsc-core 版本范围,支持 ^ ~ >= <= 与精确版本 */
  engines?: string
  /** 依赖的插件 id,安装时须已存在,激活时须已激活 */
  dependencies?: string[]
  /** 冲突的插件 id,同时安装会被拒绝 */
  conflicts?: string[]
  capabilities: DscCapability[]
  contributions?: DscContribution[]
}

/** 异步能力的通用选项,取消时抛 PluginAbortError */
export interface PluginCallOptions {
  signal?: AbortSignal
}

/** 会话摘要的可见字段 */
export interface SessionSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/** 消息附件的可见字段 */
export interface SessionAttachment {
  name: string
  size: number
  isImage: boolean
}

/** 消息的可见字段 */
export interface SessionMessage {
  id: string
  role: string
  createdAt: number
  text: string
  attachments?: SessionAttachment[]
}

/** 会话内容的可见字段 */
export interface SessionView {
  id: string
  messages: SessionMessage[]
}

/** session:changed 事件的可见字段 */
export interface SessionChangedEvent {
  activeId: string | null
}

/** 能力 sessions:list、sessions:read、sessions:rename */
export interface PluginSessionsApi {
  list(options?: PluginCallOptions): Promise<SessionSummary[]>
  read(id: string, options?: PluginCallOptions): Promise<SessionView | null>
  rename(id: string, title: string): boolean
}

/**
 * 能力 events:session。
 * 返回释放函数,引擎在停用与卸载时自动执行,插件不要自行重复调用。
 */
export interface PluginEventsApi {
  on(point: DscContribution, handler: (event: SessionChangedEvent) => void): () => void
}

/**
 * 能力 notify。
 * key 取自宿主 i18n 的既有文案键,插件不自造文案。
 */
export interface PluginUiApi {
  notify(key: string, params?: Record<string, string | number>): void
}

/** 能力 settings:locale */
export interface PluginSettingsApi {
  locale(options?: PluginCallOptions): Promise<'zh-CN' | 'en-US'>
}

/** 能力 plugins:storage,值须可 JSON 序列化,单插件上限 64KB */
export interface PluginStorageApi {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
}

/**
 * 激活时注入的上下文。
 * 各成员只在清单申请了对应能力时可用,未申请时调用抛 PluginCapabilityError。
 */
export interface PluginContext {
  /** 写入该插件的日志,可在插件面板的「查看日志」中读取 */
  log(message: string): void
  sessions: PluginSessionsApi
  events: PluginEventsApi
  ui: PluginUiApi
  settings: PluginSettingsApi
  storage: PluginStorageApi
}

/**
 * 插件对象。
 * activate 超时 5 秒,deactivate 超时 3 秒,返回值均被忽略。
 */
export interface DscPlugin {
  activate(context: PluginContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}
