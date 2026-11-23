import { open, readdir, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import type { IntranetResourceSource } from '../../shared/intranet/intranet-resources'

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.rst',
  '.html',
  '.htm'
])
const MAX_BYTES = 64 * 1024

function sourcePath(source: IntranetResourceSource): string {
  return source.path === '~'
    ? homedir()
    : /^~[\\/]/.test(source.path)
      ? join(homedir(), source.path.slice(2))
      : resolve(source.path)
}

function withinRoot(root: string, target: string): boolean {
  const path = relative(root, target)
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

export async function listIntranetResourceFiles(
  source: IntranetResourceSource
): Promise<{ files: string[]; truncated: boolean }> {
  const root = await realpath(sourcePath(source))
  if (!(await stat(root)).isDirectory()) {
    throw new Error('등록한 경로는 폴더여야 합니다.')
  }
  const files: string[] = []
  let visited = 0
  let truncated = false
  const walk = async (directory: string, depth: number): Promise<void> => {
    if (depth > 6 || visited >= 5000 || files.length >= 1000) {
      truncated = true
      return
    }
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (++visited > 5000 || files.length >= 1000) {
        truncated = true
        break
      }
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.isSymbolicLink()) {
        continue
      }
      const path = join(directory, entry.name)
      if (!withinRoot(root, await realpath(path))) {
        continue
      }
      if (entry.isDirectory()) {
        await walk(path, depth + 1)
      } else if (
        entry.isFile() &&
        (source.kind === 'skills'
          ? entry.name === 'SKILL.md'
          : TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase()))
      ) {
        files.push(relative(root, path).split(sep).join('/'))
      }
    }
  }
  await walk(root, 0)
  return { files, truncated }
}

export async function readIntranetResourceFile(
  source: IntranetResourceSource,
  file: string
): Promise<{ text: string; truncated: boolean }> {
  const root = await realpath(sourcePath(source))
  const target = await realpath(resolve(root, file))
  if (!withinRoot(root, target) || !TEXT_EXTENSIONS.has(extname(target).toLowerCase())) {
    throw new Error('등록한 폴더 안의 텍스트 문서만 읽을 수 있습니다.')
  }
  const handle = await open(target, 'r')
  try {
    const info = await handle.stat()
    if (!info.isFile()) {
      throw new Error('일반 파일만 읽을 수 있습니다.')
    }
    const bytes = Buffer.alloc(Math.min(info.size, MAX_BYTES))
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    const content = bytes.subarray(0, bytesRead)
    if (content.includes(0)) {
      throw new Error('바이너리 문서는 지원하지 않습니다.')
    }
    return { text: content.toString('utf8'), truncated: info.size > bytesRead }
  } finally {
    await handle.close()
  }
}

export async function searchIntranetResourceFiles(
  source: IntranetResourceSource,
  query: string
): Promise<{
  matches: { file: string; line: number; text: string }[]
  truncated: boolean
}> {
  const listing = await listIntranetResourceFiles(source)
  const matches: { file: string; line: number; text: string }[] = []
  let truncated = listing.truncated
  const term = query.toLocaleLowerCase()
  for (const file of listing.files) {
    try {
      const content = await readIntranetResourceFile(source, file)
      truncated ||= content.truncated
      for (const [index, line] of content.text.split(/\r?\n/).entries()) {
        if (line.toLocaleLowerCase().includes(term)) {
          matches.push({ file, line: index + 1, text: line.slice(0, 400) })
        }
        if (matches.length >= 50) {
          return { matches, truncated: true }
        }
      }
    } catch {
      truncated = true
    }
  }
  return { matches, truncated }
}
