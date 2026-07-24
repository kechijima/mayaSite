// One-off tool to create (or promote) a Firebase Auth user with the
// `admin: true` custom claim required by server/middleware/admin-auth.ts.
// Run via: npm run admin:create -- --email=you@example.com --password=xxxx           (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run admin:create:emulator -- --email=you@example.com --password=xxxx  (local Auth emulator; no credentials needed)
// Add --reset-password to overwrite an existing user's password (not done by default).
// NOTE: custom claims only take effect on the user's next ID-token refresh —
// have them sign out/in again after running this.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run admin:create:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const auth = getAuth(app)

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg?.slice(prefix.length)
}

const email = argValue('email')
const password = argValue('password')
const resetPassword = process.argv.includes('--reset-password')

if (!email) {
  console.error('Usage: --email=you@example.com [--password=xxxx] [--reset-password]')
  process.exit(1)
}

async function main() {
  let user
  try {
    user = await auth.getUserByEmail(email!)
    console.log(`User already exists: ${user.uid}`)
    if (resetPassword) {
      if (!password) {
        console.error('--reset-password requires --password= too')
        process.exit(1)
      }
      await auth.updateUser(user.uid, { password })
      console.log('Password updated.')
    }
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') throw error
    if (!password) {
      console.error('User does not exist yet — --password= is required to create it.')
      process.exit(1)
    }
    user = await auth.createUser({ email: email!, password })
    console.log(`Created user: ${user.uid}`)
  }

  await auth.setCustomUserClaims(user.uid, { admin: true })
  console.log(`admin:true claim set for ${email}. They must sign out/in again for it to take effect.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
