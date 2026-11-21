import type { PluginManifest } from './types.js'

/**
 * 插件清单,从地址安装时由产物自带的 manifest 提供。
 */
export const manifest: PluginManifest = {
  id: 'dsc-demo-log',
  name: 'Demo Log',
  version: '0.1.0',
  engines: '^1.0.0',
  capabilities: ['events:session', 'notify'],
  mounts: ['session:changed'],
}
