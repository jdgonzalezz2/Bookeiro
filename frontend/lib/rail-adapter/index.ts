/**
 * rail-adapter — backend rows → rail-core view model. Pure `toRailDay` here;
 * the server-side data access (auth + tenant-scoped queries) lives in
 * `load-real-day.ts` and is imported directly by server components.
 */
export * from './adapter'
export * from './mutation'
// load-real-day is server-only (imports the InsForge server client) and is
// imported directly by server components — deliberately NOT re-exported here.
