// Must be exactly this name — Firebase Hosting's CDN only forwards a cookie
// literally named `__session` through to a Cloud Functions rewrite target;
// any other name silently gets stripped in production (works fine in
// `nuxt dev`, breaks once deployed — see CLAUDE.md).
export const SESSION_COOKIE_NAME = '__session'
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 5 // 5 days
