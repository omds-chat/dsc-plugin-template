import type { PluginManifest } from '../../src/types.js'

/**
 * 示例清单:覆盖必填字段与全部第三方插件可申请的能力。
 * id 须匹配 ^[a-z][a-z0-9-]{2,63}$;version 只允许三段数字;capabilities 不得重复。
 */
export const manifest: PluginManifest = {
  id: 'dsc-session-digest',
  name: 'Session Digest',
  version: '0.1.0',
  engines: '^1.0.0',
  capabilities: [
    'sessions:list',
    'sessions:read',
    'events:session',
    'notify',
    'settings:locale',
    'plugins:storage',
  ],
  contributions: ['session:changed'],
}
