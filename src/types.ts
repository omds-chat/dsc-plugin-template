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

/** 挂载点,当前只实现了 session:changed */
export type DscMount = 'session:changed'

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
  mounts?: DscMount[]
}

/** 异步能力的通用选项,取消时抛 PluginAbortError */
export interface PluginCallOptions {
  signal?: AbortSignal
}

/**
 * 引擎在能力调用与生命周期里抛出的错误名。
 * 插件按 error.name 判定,不要依赖 instanceof,也不要自行构造。
 */
export type PluginErrorName =
  | 'PluginCapabilityError'
  | 'PluginRateLimitError'
  | 'PluginTimeoutError'
  | 'PluginAbortError'
  | 'PluginDataError'
  | 'PluginFetchError'

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

/** 消息的可见字段;不含附件本地 id、服务端 file_id 与原件 */
export interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  createdAt: number
  text: string
  attachments: SessionAttachment[]
}

/** 会话内容的可见字段,在摘要之上追加消息列表;不含分支结构与请求快照 */
export interface SessionView extends SessionSummary {
  messages: SessionMessage[]
}

/** session:changed 事件的可见字段 */
export interface SessionChangedEvent {
  type: 'session:changed'
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
  on(point: DscMount, handler: (event: SessionChangedEvent) => void): () => void
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

/**
 * 能力 plugins:storage。
 * 值须可 JSON 序列化,单插件上限 64KB,键名非空且不超过 64 字符,缺失的键返回 null。
 */
export interface PluginStorageApi {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
}

/** 外源文本请求的返回,只有最终地址、内容类型与文本 */
export interface PluginNetResponse {
  url: string
  contentType: string
  text: string
}

/** 计数请求的返回,响应体被丢弃,只回传最终地址与状态码 */
export interface PluginNetPostResponse {
  url: string
  status: number
}

/**
 * 能力 net:fetch。只对内置插件开放:第三方插件清单申请它时,
 * 安装结果与申请一个不存在的能力一样,都是 unknown-capability。
 * 请求约束由宿主落实:仅 https、不带凭证、响应体上限 512KB、超时 10 秒。
 */
export interface PluginNetApi {
  getText(url: string, options?: PluginCallOptions): Promise<PluginNetResponse>
  postJson(url: string, body: unknown, options?: PluginCallOptions): Promise<PluginNetPostResponse>
}

/**
 * 激活时注入的上下文。
 * 各能力成员只在清单申请了对应能力时可用,未申请时调用抛 PluginCapabilityError。
 */
export interface PluginContext {
  /** 当前插件 id,与清单一致 */
  readonly id: string
  /** 当前插件版本,与清单一致 */
  readonly version: string
  /** 写入该插件的日志,可在插件面板的「查看日志」中读取 */
  log(message: string): void
  sessions: PluginSessionsApi
  events: PluginEventsApi
  ui: PluginUiApi
  settings: PluginSettingsApi
  net: PluginNetApi
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
