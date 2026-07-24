#!/usr/bin/env node
// Single-command local dev: starts the Firebase emulators (Firestore/Auth/
// Hosting), waits for Firestore to be ready, seeds diagnosisContent (idempotent
// — skips docs that already exist), then starts the Nuxt dev server. `npm run dev`
// is this script; the underlying pieces stay available individually as
// `npm run emulators` / `npm run seed:content:emulator` / `npm run dev:nuxt`
// (this script just re-runs those same package.json scripts, not duplicated
// commands, so there's one source of truth).
//
// If a Firestore emulator is already listening on 127.0.0.1:8080 (e.g. started
// separately in another terminal), this reuses it instead of starting a second
// instance, and won't stop it (or the Nuxt dev server, which it always owns) on exit.
import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const FIRESTORE_URL = 'http://127.0.0.1:8080'

function runScript(name) {
  // detached so each gets its own process group and can be reliably signaled
  // as a whole (npm -> firebase-tools -> java, or npm -> nuxt) with one kill,
  // regardless of how many wrapper layers are in between.
  return spawn('npm', ['run', name], { stdio: 'inherit', detached: true })
}

function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal)
  } catch {
    // process/group already gone
  }
}

// Kills `child`'s whole process group and resolves once it has actually
// exited (or immediately, if it already had). Never rejects.
function stopAndWait(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    child.once('exit', () => resolve())
    killGroup(child, 'SIGINT')
  })
}

async function pingFirestore() {
  try {
    await fetch(FIRESTORE_URL)
    return true
  } catch {
    return false
  }
}

async function waitForFirestore(timeoutMs) {
  const start = Date.now()
  while (!(await pingFirestore())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Firestore emulator did not respond at ${FIRESTORE_URL} within ${timeoutMs / 1000}s`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

// Homebrew's openjdk is keg-only (not symlinked onto PATH by default) — if
// `java` isn't already resolvable, check the well-known Homebrew locations
// and patch process.env.PATH (inherited by every spawn() below) ourselves,
// rather than requiring the user to edit their shell profile just to run
// `npm run dev`.
const HOMEBREW_OPENJDK_BIN = ['/opt/homebrew/opt/openjdk/bin', '/usr/local/opt/openjdk/bin']

function ensureJavaOnPath() {
  const hasJava = () => {
    try {
      execSync('java -version', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  if (hasJava()) return

  for (const dir of HOMEBREW_OPENJDK_BIN) {
    if (existsSync(`${dir}/java`)) {
      process.env.PATH = `${dir}:${process.env.PATH}`
      if (hasJava()) return
    }
  }

  throw new Error(
    'Java runtime not found (required by the Firestore/Functions emulators).\n' +
    '  Install it with: brew install openjdk'
  )
}

let emulator = null
let seed = null
let dev = null
let ownsEmulator = false
let shuttingDown = false

async function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true

  const tasks = [stopAndWait(dev), stopAndWait(seed)]
  if (ownsEmulator && emulator) {
    console.log('▸ stopping emulators (exporting data to .firebase-emulator-data/)...')
    tasks.push(stopAndWait(emulator))
  }

  await Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, 15_000))]) // safety net if shutdown hangs
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function main() {
  if (await pingFirestore()) {
    console.log(`▸ Firestore emulator already running at ${FIRESTORE_URL} — reusing it.`)
  } else {
    ensureJavaOnPath()
    console.log('▸ starting Firebase emulators (firestore, auth, hosting)...')
    ownsEmulator = true
    emulator = runScript('emulators')
    emulator.on('exit', (code) => {
      if (!shuttingDown) {
        console.error(`✖ emulators exited unexpectedly (code ${code})`)
        shutdown(code ?? 1)
      }
    })
    await waitForFirestore(60_000)
  }

  console.log('▸ seeding diagnosisContent (skips docs that already exist)...')
  await new Promise((resolve, reject) => {
    seed = runScript('seed:content:emulator')
    seed.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed script exited with code ${code}`))))
  })

  console.log('▸ starting Nuxt dev server...')
  dev = runScript('dev:nuxt')
  dev.on('exit', (code) => shutdown(code ?? 0))
}

main().catch((err) => {
  console.error(`✖ ${err.message}`)
  shutdown(1)
})
