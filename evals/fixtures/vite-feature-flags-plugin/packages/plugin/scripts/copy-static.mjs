import { copyFile } from 'node:fs/promises'

await Promise.all([
  copyFile('src/virtual.d.ts', 'dist/virtual.d.ts'),
  copyFile('src/empty.js', 'dist/empty.js'),
])
