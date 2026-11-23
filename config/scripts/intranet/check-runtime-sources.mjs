import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript-api'

const roots = ['src/main', 'src/shared', 'src/renderer/src', 'src/cli', 'src/preload']
const retiredPath =
  /src\/main\/(?:telemetry\/|updater\/|google\/|linear\/|composio\/|connector-cloud\/|artifacts\/|host-oauth\/|bots\/tool-(?:oauth|relay)\/|skills\/cloud\/|runtime\/(?:push\/|mobile-cloud-relay\/)|observability\/diagnostic-(?:upload|bundle-upload)|runtime\/rpc\/transports\/relay-transport|browser\/extensions\/web-store\/browser-extension-webstore-(?:download|updater)|agent-cli-update\/agent-cli-latest-release|speech\/(?:openai-transcription-client|node-speech-download-request))/

const forbiddenPackages = new Set(['posthog-node', 'electron-updater', '@linear/sdk'])
const publicEndpoint =
  /^https?:\/\/(?:us\.i\.posthog\.com|backend\.composio\.dev|(?:connector|push|share)\.(?:orca|onorca)\.dev|api\.bitbucket\.org|huggingface\.co|(?:unofficial-builds\.)?nodejs\.org\/(?:dist|download)|(?:www\.)?google\.com\/(?:s2\/favicons|search)|duckduckgo\.com\/\?q|www\.bing\.com\/search|kagi\.com\/search|orca\.dev\/(?:plugins\/(?:stats|kill-list)|whats-new)|downloads\.claude\.ai|dl\.google\.com\/agy-extensions|(?:oauth2|gmail|docs|sheets|people|cloudcode-pa)\.googleapis\.com|api\.anthropic\.com\/api\/oauth|chatgpt\.com\/backend-api)/i
const excluded =
  /(?:[./-])(?:test|tests|spec|fixture|fixtures|testing|__mocks__|__fixtures__)(?:[./-])/
const failures = []

function files(directory) {
  if (!existsSync(directory)) {
    return []
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

function report(file, ast, node, message) {
  const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast))
  failures.push(`${file}:${line + 1}: ${message}`)
}

let checked = 0
for (const absolute of roots.flatMap(files)) {
  const file = relative(process.cwd(), absolute).replaceAll('\\', '/')
  if (excluded.test(file) || file.includes('.generated.')) {
    continue
  }
  checked += 1
  const text = readFileSync(absolute, 'utf8')
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      forbiddenPackages.has(node.arguments[0].text)
    ) {
      report(file, ast, node, 'Removed service SDK loaded dynamically')
    }
    if (ts.isStringLiteralLike(node) && node.text === '--claudeai') {
      report(file, ast, node, 'Forced public-provider login command remains')
    }
    if (ts.isImportDeclaration(node) && forbiddenPackages.has(node.moduleSpecifier.text)) {
      const clause = node.importClause
      const typesOnly =
        clause?.isTypeOnly ||
        (!clause?.name &&
          clause?.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.every((item) => item.isTypeOnly))
      if (!typesOnly) {
        report(file, ast, node, 'Removed service SDK imported as runtime code')
      }
    }
    if (
      (ts.isStringLiteralLike(node) || ts.isTemplateHead(node)) &&
      publicEndpoint.test(node.text)
    ) {
      report(file, ast, node, 'Built-in public service endpoint remains')
    }
    if (retiredPath.test(file)) {
      if (ts.isCallExpression(node)) {
        const call = node.expression.getText(ast)
        if (
          /(?:^|\.)(?:fetch|fetchImpl|fetchUpstream|fetchFn|httpRequest|httpsRequest)$/.test(call)
        ) {
          report(file, ast, node, 'Outbound request implementation remains in a removed service')
        }
      }
      if (
        ts.isNewExpression(node) &&
        /(?:WebSocket|PostHog|LinearClient)$/.test(node.expression.getText(ast))
      ) {
        report(file, ast, node, 'Outbound service client construction remains')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
for (const name of forbiddenPackages) {
  if (name in manifest.dependencies) {
    failures.push(`package.json: removed runtime dependency ${name}`)
  }
}
for (const directory of ['cloud/apps', 'mobile/app', 'mobile/src', 'mobile/web-entry']) {
  if (files(directory).length) {
    failures.push(`${directory}: removed cloud/mobile executable source remains`)
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Intranet source checks passed (${checked} application source files).\n`)
}
