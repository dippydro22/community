import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await cp('public', 'dist', { recursive: true })
await mkdir('dist/vendor', { recursive: true })
for (const file of ['three.module.min.js', 'three.core.min.js']) {
  await cp('node_modules/three/build/' + file, 'dist/vendor/' + file)
}
await cp('node_modules/three/LICENSE', 'dist/vendor/three.LICENSE')
