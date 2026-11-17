import { manifest } from './manifest.js'
import type { PluginContext } from './types.js'

export { manifest }

// 首次激活提示使用的宿主文案键,取自宿主 i18n 的既有键,插件不自造文案
const INSTALL_NOTICE_KEY = 'pluginInstallDone'

// events.on 返回的释放函数由引擎在停用与卸载时自动执行,这里只保留引用用于观察
let releaseSubscription: (() => void) | null = null
let active = false
let firstActivation = true

/**
 * 启动入口,引擎在激活时调用,超时 5 秒。
 * 返回值被忽略,不要用它传递释放函数。
 */
export const activate = (context: PluginContext): void => {
  if (active) {
    context.log(manifest.id + ': already active, skip activate')
    return
  }

  active = true
  context.log(manifest.id + ': activated, capabilities ' + manifest.capabilities.join(', '))

  releaseSubscription = context.events.on('session:changed', (event) => {
    context.log(manifest.id + ': session:changed -> ' + String(event.activeId ?? 'none'))
  })

  if (firstActivation) {
    firstActivation = false
    context.ui.notify(INSTALL_NOTICE_KEY)
  }
}

/**
 * 停用入口,引擎在停用与卸载时调用,超时 3 秒。
 *
 * 注意：事件订阅的释放函数由引擎自动执行,此处不再重复调用,
 * 只丢弃本地引用并复位插件自身的状态。
 */
export const deactivate = (): void => {
  if (releaseSubscription !== null) {
    // 释放函数由引擎自动执行,这里不重复调用,只丢弃本地引用
    releaseSubscription = null
  }
  active = false
}
