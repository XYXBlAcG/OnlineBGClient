#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CODEX_HOME = join(ROOT, '.tmp', 'codex-home')
const RUN_DIR = join(ROOT, '.tmp', 'codex')
const TASK_NAMES = ['ask', 'ui-review', 'diff-review', 'plan-review']
const DEFAULT_TIMEOUT = 300

const UI_PROMPT = `你是移动端在线桌游的界面评审员。只依据随附截图和截图中可直接观察到的证据评审，不臆测未展示的页面、状态或实现；每条结论必须指到具体截图与界面位置。
按以下类别分别列出问题：遮挡与裁切、层级与信息密度、横屏低高度可用性、文案与提示。
每条问题给出：严重度（阻断/高/中/低）、截图文件名与位置、观察到的事实、可执行的修复方向（具体到布局区域、组件或优先级调整）。
不要泛泛而谈设计原则，不要复述截图内容；最后给出按优先级排序的前三项行动。`

const DIFF_PROMPT = (diff) => `你是资深代码评审员。以下是脚本收集的仓库当前未提交 diff；当前只读沙箱无法读取仓库其他文件，不要尝试读取文件，只依据 diff 文本和附加要求评审。
不臆测未展示的改动、测试结果或运行环境；无法确认时明确写“证据不足”。
重点检查：正确性缺陷、行为回归风险、缺失的测试或边界处理、与 AGENTS.md 原则（SSOT、KISS、无注释、无兼容包袱、职责单一）的冲突。
输出：按严重度排序的问题列表，每条给出文件与行号、证据、影响、可执行的修复建议；没有问题的检查维度明确写“无”。不要只复述 diff。
未提交 diff：
<uncommitted_diff>
${diff}
</uncommitted_diff>`

const PLAN_PROMPT = (plan) => `你是对抗性方案评审员。只依据下方方案文本和仓库现状证据评审，不臆测资源、依赖或结论。
重点找：缺失的依赖与前置条件、未处理的风险与回滚方案、不可执行或无法验证的验收标准、与现有架构和 AGENTS.md 原则的冲突、被忽略的边界与失败路径。
输出：阻断性问题、高风险问题、建议补充的验收标准；每条给出依据与可执行的修改建议。最后给出一句话结论：可执行 / 需修订 / 不可执行。
方案内容：
${plan}`

function fail(message) {
  console.error(`[codex] ${message}`)
  process.exit(1)
}

function usage() {
  console.log(`用法：node scripts/agent/codex.mjs --task <${TASK_NAMES.join('|')}> [选项]

选项：
  --prompt "..."        提问、附加要求或方案内容
  --prompt-file <文件>  从文件读取提问、附加要求或方案内容
  --images a.png ...    随附截图（ui-review 必填）
  --cwd <目录>          codex 工作根目录，默认仓库根
  --model <模型>        覆盖 config.toml 中的模型
  --output <文件>       结果 markdown 路径，默认 .tmp/codex/<时间>-<任务>.md
  --timeout <秒>        执行超时，默认 ${DEFAULT_TIMEOUT}
  --help                显示帮助`)
}

function parseArgs(argv) {
  const options = { task: '', prompt: '', promptFile: '', images: [], cwd: '', model: '', output: '', timeout: 0 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const takeValue = () => {
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) fail(`${arg} 缺少参数值`)
      i += 1
      return next
    }
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0) }
    else if (arg === '--task') options.task = takeValue()
    else if (arg === '--prompt') options.prompt = takeValue()
    else if (arg === '--prompt-file') options.promptFile = takeValue()
    else if (arg === '--cwd') options.cwd = takeValue()
    else if (arg === '--model') options.model = takeValue()
    else if (arg === '--output') options.output = takeValue()
    else if (arg === '--timeout') options.timeout = Number(takeValue())
    else if (arg === '--images') {
      const start = i + 1
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { options.images.push(argv[i + 1]); i += 1 }
      if (i + 1 === start) fail('--images 至少需要一个图片路径')
    } else fail(`未知参数：${arg}（--help 查看用法）`)
  }
  return options
}

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function absoluteFromInvocation(path) {
  return isAbsolute(path) ? path : resolve(process.cwd(), path)
}

function readPromptFile(file) {
  const path = absoluteFromInvocation(file)
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    return fail(`读取 --prompt-file 失败：${path}（${error.message}）`)
  }
}

function resolveImages(images) {
  return images.map((image) => {
    const path = absoluteFromInvocation(image)
    if (!existsSync(path) || !statSync(path).isFile()) fail(`截图不存在：${path}`)
    return path
  })
}

function prepareCodexHome() {
  const sourceHome = join(homedir(), '.codex')
  const sources = {
    'config.toml': join(sourceHome, 'config.toml'),
    'auth.json': join(sourceHome, 'auth.json'),
  }
  for (const source of Object.values(sources)) {
    if (!existsSync(source)) fail(`缺少 ${source}；请先执行 codex login，确认 ~/.codex 已初始化`)
  }
  try {
    mkdirSync(CODEX_HOME, { recursive: true })
  } catch (error) {
    return fail(`无法创建 CODEX_HOME：${CODEX_HOME}（${error.message}）；请确认 .tmp/ 可写`)
  }
  const copy = (name) => {
    const source = sources[name]
    const target = join(CODEX_HOME, name)
    try {
      copyFileSync(source, target)
      chmodSync(target, 0o600)
    } catch (error) {
      return fail(`准备 CODEX_HOME 失败：${source} -> ${target}（${error.message}）；请确认 .tmp/ 可写且源文件可读`)
    }
  }
  if (!existsSync(join(CODEX_HOME, 'config.toml'))) copy('config.toml')
  const targetAuth = join(CODEX_HOME, 'auth.json')
  if (!existsSync(targetAuth) || statSync(targetAuth).mtimeMs < statSync(sources['auth.json']).mtimeMs) copy('auth.json')
}

function systemProxy() {
  if (process.platform !== 'darwin') return ''
  const result = spawnSync('scutil', ['--proxy'], { encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout) return ''
  const field = (name) => {
    const match = result.stdout.match(new RegExp(`${name}\\s*:\\s*([^\\n]+)`))
    return match ? match[1].trim() : ''
  }
  const read = (prefix) => (field(`${prefix}Enable`) === '1' ? { host: field(`${prefix}Proxy`) || '127.0.0.1', port: field(`${prefix}Port`) } : null)
  const proxy = read('HTTPS') || read('HTTP')
  return proxy && /^\d+$/.test(proxy.port) ? `http://${proxy.host}:${proxy.port}` : ''
}

function resolveProxy() {
  const names = { HTTPS_PROXY: ['HTTPS_PROXY', 'https_proxy'], HTTP_PROXY: ['HTTP_PROXY', 'http_proxy'], ALL_PROXY: ['ALL_PROXY', 'all_proxy'] }
  const values = Object.fromEntries(Object.entries(names).map(([key, aliases]) => [key, aliases.map((alias) => process.env[alias]).find(Boolean) || '']))
  const fallback = Object.values(values).find(Boolean)
  if (fallback) return { HTTPS_PROXY: values.HTTPS_PROXY || fallback, HTTP_PROXY: values.HTTP_PROXY || fallback, ALL_PROXY: values.ALL_PROXY || fallback }
  const detected = systemProxy()
  if (!detected) fail('未检测到可用代理；请启动 CC Switch/Clash 或显式设置 HTTPS_PROXY（例如 HTTPS_PROXY=http://127.0.0.1:7897）')
  return { HTTPS_PROXY: detected, HTTP_PROXY: detected, ALL_PROXY: detected }
}

function assertCodex() {
  const result = spawnSync('codex', ['--version'], { encoding: 'utf8' })
  if (result.error || result.status !== 0) fail('未找到可用的 codex CLI；请安装并确认 `codex --version` 可执行（例如 npm i -g @openai/codex）')
}

function collectDiff(cwd) {
  const result = spawnSync('git', ['diff', 'HEAD', '--no-ext-diff', '--no-color'], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.error) fail(`收集 git diff 失败：${result.error.message}`)
  if (result.status !== 0) fail(`git diff 失败：${(result.stderr || '').trim() || `退出码 ${result.status}`}`)
  if (!result.stdout.trim()) fail('当前仓库没有未提交改动，无需 diff-review')
  return result.stdout
}

function buildPrompt(options, extra, diffText) {
  if (options.task === 'ask') return extra
  if (options.task === 'ui-review') return extra.trim() ? `${UI_PROMPT}\n\n附加要求：\n${extra}` : UI_PROMPT
  if (options.task === 'diff-review') return extra.trim() ? `${DIFF_PROMPT(diffText)}\n\n附加要求：\n${extra}` : DIFF_PROMPT(diffText)
  return PLAN_PROMPT(extra)
}

function extractTokens(text) {
  const matches = [...text.matchAll(/tokens used\s*[:：=]?\s*([\d,]+)/gi)]
  return matches.length === 0 ? '' : matches[matches.length - 1][1]
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!TASK_NAMES.includes(options.task)) fail(`--task 必须是 ${TASK_NAMES.join(' / ')}；当前为 ${options.task || '空'}`)
  const timeout = options.timeout || DEFAULT_TIMEOUT
  if (!Number.isFinite(timeout) || timeout <= 0) fail('--timeout 必须是正整数秒')
  const cwd = options.cwd ? absoluteFromInvocation(options.cwd) : ROOT
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) fail(`--cwd 目录不存在：${cwd}`)
  const images = resolveImages(options.images)
  if (options.task === 'ui-review' && images.length === 0) fail('ui-review 需要至少一张截图：--images a.png [b.png ...]')
  if (options.prompt && options.promptFile) fail('--prompt 与 --prompt-file 只能提供一个')
  const extra = options.prompt || (options.promptFile ? readPromptFile(options.promptFile) : '')
  if (options.task === 'ask' && !extra.trim()) fail('ask 需要提供问题：--prompt 或 --prompt-file')
  if (options.task === 'plan-review' && !extra.trim()) fail('plan-review 需要提供方案内容：--prompt 或 --prompt-file')

  prepareCodexHome()
  assertCodex()
  const proxy = resolveProxy()
  const stamp = timestamp()
  mkdirSync(RUN_DIR, { recursive: true })
  const diffText = options.task === 'diff-review' ? collectDiff(cwd) : ''
  const prompt = buildPrompt(options, extra, diffText)
  const logPath = join(RUN_DIR, `${stamp}-${options.task}.log`)
  const lastMessagePath = join(RUN_DIR, `${stamp}-${options.task}.last.md`)
  const outputPath = options.output ? absoluteFromInvocation(options.output) : join(RUN_DIR, `${stamp}-${options.task}.md`)
  const args = ['exec', '--skip-git-repo-check', '-s', 'read-only', '-C', cwd, '--color', 'never', '--output-last-message', lastMessagePath]
  if (options.model) args.push('--model', options.model)
  for (const image of images) args.push('-i', image)

  const log = createWriteStream(logPath)
  const child = spawn('codex', args, { cwd, env: { ...process.env, CODEX_HOME, ...proxy }, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  child.stdin.on('error', () => {})
  child.stdin.end(prompt)

  const started = Date.now()
  let timedOut = false
  let killTimer
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGTERM')
    killTimer = setTimeout(() => child.kill('SIGKILL'), 5000)
  }, timeout * 1000)

  const { code, signal } = await new Promise((resolveExit) => {
    child.once('error', (error) => {
      clearTimeout(timer)
      log.end(() => fail(`启动 codex 失败：${error.message}`))
    })
    child.once('close', (exitCode, exitSignal) => {
      clearTimeout(timer)
      if (killTimer) clearTimeout(killTimer)
      log.end(() => resolveExit({ code: exitCode, signal: exitSignal }))
    })
  })
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  if (timedOut) fail(`codex 执行超时（${timeout}s）已终止；请增大 --timeout 或缩小输入。日志：${logPath}`)
  if (code !== 0) fail(`codex 退出码 ${code}${signal ? `（信号 ${signal}）` : ''}；日志：${logPath}\n下一步：确认代理已启动（CC Switch/Clash 或显式 HTTPS_PROXY）、登录有效（codex login）、模型可用（--model）`)
  if (!existsSync(lastMessagePath)) fail(`codex 未生成结果文件；日志：${logPath}`)
  const result = readFileSync(lastMessagePath, 'utf8')
  if (!result.trim()) fail(`codex 返回内容为空；日志：${logPath}`)
  mkdirSync(dirname(outputPath), { recursive: true })
  copyFileSync(lastMessagePath, outputPath)
  unlinkSync(lastMessagePath)
  const tokens = extractTokens(readFileSync(logPath, 'utf8'))
  console.log(`输出：${outputPath}`)
  console.log(`日志：${logPath}`)
  console.log(`耗时：${elapsed}s${tokens ? `，tokens：${tokens}` : ''}`)
}

main().catch((error) => fail(`执行失败：${error?.message || error}`))
