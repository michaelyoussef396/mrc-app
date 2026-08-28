// Photo capacity clamp.
//
// getRemainingPhotoSlots() is what stops a bulk selection from being uploaded
// and then discarded. The cap used to be checked after the upload loop, which
// wrote every file to Storage and inserted every photos row before returning —
// leaving orphans that nothing in the form referenced. Multi-select turned that
// from an occasional slip into the normal case, so these pin the clamp.

import { describe, it, expect } from 'vitest'
import { getRemainingPhotoSlots, SINGLE_SLOT_PHOTO_TYPES } from '@/lib/utils/photoSlots'

const EMPTY_COUNTS = { roomView: 0, subfloor: 0 }

describe('getRemainingPhotoSlots', () => {
  it('allows four room photos in an empty area', () => {
    expect(getRemainingPhotoSlots('roomView', EMPTY_COUNTS, false)).toBe(4)
  })

  it('allows only the balance when an area already holds room photos', () => {
    expect(getRemainingPhotoSlots('roomView', { roomView: 3, subfloor: 0 }, false)).toBe(1)
  })

  it('returns zero once an area is full of room photos', () => {
    expect(getRemainingPhotoSlots('roomView', { roomView: 4, subfloor: 0 }, false)).toBe(0)
  })

  it('allows twenty subfloor photos when none exist yet', () => {
    expect(getRemainingPhotoSlots('subfloor', EMPTY_COUNTS, false)).toBe(20)
  })

  it('allows only the balance when subfloor photos already exist', () => {
    expect(getRemainingPhotoSlots('subfloor', { roomView: 0, subfloor: 19 }, false)).toBe(1)
  })

  it('returns zero once the subfloor limit is reached', () => {
    expect(getRemainingPhotoSlots('subfloor', { roomView: 0, subfloor: 20 }, false)).toBe(0)
  })

  it.each([...SINGLE_SLOT_PHOTO_TYPES])('allows exactly one photo for single-slot type %s', (type) => {
    expect(getRemainingPhotoSlots(type, EMPTY_COUNTS, false)).toBe(1)
  })

  it('allows exactly one photo for a moisture reading', () => {
    expect(getRemainingPhotoSlots('roomView', EMPTY_COUNTS, true)).toBe(1)
  })

  it('does not cap a type with no slot limit', () => {
    expect(getRemainingPhotoSlots('somethingElse', EMPTY_COUNTS, false)).toBe(
      Number.POSITIVE_INFINITY
    )
  })
})
