/**
 * rail-core — the pure, dependency-free "brain" of the Bookeiro Time-Rail.
 *
 * ZERO React, ZERO backend, ZERO browser APIs. Will be consumed (later) by the
 * marketing demo, owner dashboard, staff view, and storefront. The rules mirror
 * the backend SQL / server actions; the backend stays the source of truth.
 */
export * from './types'
export * from './view-model'
export * from './time'
export * from './status'
export * from './rules'
export * from './ledger'
