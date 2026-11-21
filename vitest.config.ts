import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Exercise browser render functions with Vue's in-memory renderer in Node.
// The default SSR transform produces only ssrRender, which cannot receive events.
const vuePlugin = vue()
const transform = vuePlugin.transform
if (transform && typeof transform === 'object') {
  const handler = transform.handler
  transform.handler = function (code, id, options) {
    return handler.call(this, code, id, { moduleType: options?.moduleType ?? 'js', ...options, ssr: false })
  }
}
export default defineConfig({ plugins: [vuePlugin], test: { include: ['src/**/*.test.ts'] } })
