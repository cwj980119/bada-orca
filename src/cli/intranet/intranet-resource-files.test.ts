import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  listIntranetResourceFiles,
  readIntranetResourceFile,
  searchIntranetResourceFiles
} from './intranet-resource-files'
import type { IntranetResourceSource } from '../../shared/intranet/intranet-resources'

let temporary: string | undefined
afterEach(async () => {
  if (temporary) {
    await rm(temporary, { recursive: true, force: true })
  }
})

it('lists skill guides, finds documented knowledge, and refuses files outside the registered folder', async () => {
  temporary = await mkdtemp(join(tmpdir(), 'orca-company-resources-'))
  const root = join(temporary, 'company')
  await mkdir(join(root, 'release'), { recursive: true })
  await writeFile(
    join(root, 'release', 'SKILL.md'),
    '---\nname: release\n---\nRead the company release policy.'
  )
  await writeFile(join(root, 'policy.md'), '# Release policy\nApproval required before production.')
  await writeFile(join(temporary, 'private.md'), 'outside source')
  const source: IntranetResourceSource = {
    id: 'company',
    name: 'Company',
    path: root,
    kind: 'skills',
    enabled: true
  }
  expect(await listIntranetResourceFiles(source)).toEqual({
    files: ['release/SKILL.md'],
    truncated: false
  })
  expect((await readIntranetResourceFile(source, 'release/SKILL.md')).text).toContain(
    'Read the company release policy.'
  )
  expect(await searchIntranetResourceFiles({ ...source, kind: 'knowledge' }, 'approval')).toEqual({
    matches: [{ file: 'policy.md', line: 2, text: 'Approval required before production.' }],
    truncated: false
  })
  await expect(readIntranetResourceFile(source, '../private.md')).rejects.toThrow()
})
