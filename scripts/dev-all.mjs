import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const children = []
let stopping = false

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host })
    socket.setTimeout(700)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

function stopChildren(exitCode = 0) {
  if (stopping) return
  stopping = true

  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  }

  process.exit(exitCode)
}

function launch(label, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    windowsHide: false,
  })

  children.push(child)
  child.once('error', (error) => {
    console.error(`[${label}] Не удалось запустить: ${error.message}`)
    stopChildren(1)
  })
  child.once('exit', (code) => {
    if (!stopping && code !== 0) {
      console.error(`[${label}] Процесс завершился с кодом ${code}.`)
      stopChildren(code || 1)
    }
  })
}

const backendAlreadyRunning = await isPortOpen(8000)
const frontendAlreadyRunning = await isPortOpen(5173)

if (backendAlreadyRunning) {
  console.log('[backend] Уже работает: http://127.0.0.1:8000')
} else {
  const sitePackages = path.join(projectRoot, 'myvenv', 'Lib', 'site-packages')
  const pythonPath = process.env.PYTHONPATH
    ? `${sitePackages}${path.delimiter}${process.env.PYTHONPATH}`
    : sitePackages

  launch(
    'backend',
    'py.exe',
    ['-3.13', 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'],
    { PYTHONPATH: pythonPath },
  )
}

if (frontendAlreadyRunning) {
  console.log('[frontend] Уже работает: http://localhost:5173')
} else {
  launch(
    'frontend',
    process.execPath,
    [path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', 'localhost', '--port', '5173', '--strictPort'],
  )
}

console.log('CareerHub запускается…')
console.log('Сайт:    http://localhost:5173')
console.log('Backend: http://127.0.0.1:8000')
console.log('Для остановки нажмите Ctrl+C.')

if (children.length === 0) {
  console.log('Оба сервиса уже были запущены.')
} else {
  process.once('SIGINT', () => stopChildren(0))
  process.once('SIGTERM', () => stopChildren(0))
}
