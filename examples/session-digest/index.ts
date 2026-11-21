import { manifest } from './manifest.js'
import type { PluginContext, PluginErrorName } from '../../src/types.js'

/*
 * 产物必须保留 manifest 与 activate 两个具名导出;
 * 这里把 manifest 转出,安装时以产物自带的清单为准。
 */
export { manifest }

/* 宿主提示文案键,取自宿主 i18n 的既有键,插件不自造文案 */
const NOTICE_KEY = 'pluginInstallDone'
/* 插件数据键名非空且不超过 64 字符 */
const STATE_KEY = 'digest-state'
/* 只保留最近几条摘要,避免插件数据逼近 64KB 上限 */
const MAX_DIGESTS = 5

interface DigestState {
  switches: number
  lastActiveId: string | null
  digests: string[]
}

/* 能力调用失败时引擎抛出的错误按 name 区分,插件不依赖 instanceof */
const ERROR_NAMES: readonly PluginErrorName[] = [
  'PluginCapabilityError',
  'PluginRateLimitError',
  'PluginTimeoutError',
  'PluginAbortError',
  'PluginDataError',
  'PluginFetchError',
]

const errorNameOf = (error: unknown): PluginErrorName | null => {
  if (!(error instanceof Error)) {
    return null
  }
  const name = error.name
  return ERROR_NAMES.find((item) => item === name) ?? null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/* 读回插件数据;值来自 localStorage,读到的形态不可信,逐字段收敛 */
const readState = (context: PluginContext): DigestState => {
  const raw = context.storage.get(STATE_KEY)
  if (!isRecord(raw)) {
    return { switches: 0, lastActiveId: null, digests: [] }
  }
  const switches = typeof raw.switches === 'number' && Number.isFinite(raw.switches) ? raw.switches : 0
  const lastActiveId = typeof raw.lastActiveId === 'string' ? raw.lastActiveId : null
  const digests = Array.isArray(raw.digests)
    ? raw.digests.filter((item): item is string => typeof item === 'string')
    : []
  return { switches, lastActiveId, digests }
}

/* 写回插件数据;超限或无法序列化时只记日志,不影响插件其余功能 */
const writeState = (context: PluginContext, state: DigestState): void => {
  try {
    context.storage.set(STATE_KEY, {
      switches: state.switches,
      lastActiveId: state.lastActiveId,
      digests: state.digests,
    })
  } catch (error) {
    context.log('storage rejected: ' + String(errorNameOf(error) ?? 'unknown'))
  }
}

/* 停用时用它取消在途的异步调用,避免能力调用超时后继续写数据 */
let controller: AbortController | null = null
/* events.on 返回的释放函数由引擎在停用与卸载时自动执行,这里只保留引用 */
let release: (() => void) | null = null

const digestOf = (messageCount: number): string => String(messageCount) + ' messages'

const handleSwitch = async (context: PluginContext, activeId: string | null): Promise<void> => {
  const state = readState(context)
  state.switches += 1
  state.lastActiveId = activeId
  /* 停用会把 controller 置空,这里取一份引用,避免后续调用拿到 null */
  const current = controller

  if (activeId !== null && current !== null) {
    try {
      const view = await context.sessions.read(activeId, { signal: current.signal })
      if (view !== null) {
        state.digests = [...state.digests, digestOf(view.messages.length)].slice(-MAX_DIGESTS)
      }
    } catch (error) {
      const name = errorNameOf(error)
      context.log('sessions.read failed: ' + String(name ?? 'unknown'))
      /* 已取消或已超时,本次不再落盘,等下一次会话切换重试 */
      if (name === 'PluginAbortError' || name === 'PluginTimeoutError') {
        return
      }
    }
  }

  if (current !== null) {
    try {
      const sessions = await context.sessions.list({ signal: current.signal })
      context.log('sessions: ' + String(sessions.length))
    } catch (error) {
      context.log('sessions.list failed: ' + String(errorNameOf(error) ?? 'unknown'))
    }
  }

  writeState(context, state)
  context.log('session:changed -> ' + String(activeId ?? 'none') + ' (' + String(state.switches) + ')')
}

/**
 * 启动入口,超时 5 秒;返回值被忽略,不要在返回值里传释放函数。
 * 重复激活时直接返回,保证只注册一份订阅。
 */
export const activate = async (context: PluginContext): Promise<void> => {
  if (release !== null) {
    context.log(manifest.id + ': already active, skip activate')
    return
  }

  controller = new AbortController()
  context.log(manifest.id + ' ' + context.version + ': activated')

  const state = readState(context)
  if (state.switches === 0) {
    try {
      context.ui.notify(NOTICE_KEY)
    } catch (error) {
      /* 能力未授予时只记日志,不阻断激活 */
      context.log('notify failed: ' + String(errorNameOf(error) ?? 'unknown'))
    }
  }

  try {
    const locale = await context.settings.locale({ signal: controller.signal })
    context.log('locale: ' + locale)
  } catch (error) {
    context.log('settings.locale failed: ' + String(errorNameOf(error) ?? 'unknown'))
  }

  release = context.events.on('session:changed', (event) => {
    void handleSwitch(context, event.activeId)
  })
}

/**
 * 停用入口,超时 3 秒;之后引擎自动执行 events.on 返回的释放函数并清空挂载点,
 * 这里只取消在途调用并丢弃本地引用,不重复调用释放函数。
 */
export const deactivate = (): void => {
  controller?.abort()
  controller = null
  release = null
}
