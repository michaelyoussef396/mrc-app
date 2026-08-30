// Photo slot capacity for the inspection form.
//
// The cap used to be checked after the upload loop had already written every
// file to Storage and inserted every photos row, then returned — leaving
// orphans that nothing in the form referenced. Bulk multi-select turns that
// from an occasional slip into the normal case, so the clamp has to run before
// anything is uploaded.

export const MAX_ROOM_VIEW_PHOTOS = 4
export const MAX_SUBFLOOR_PHOTOS = 20

// Types backed by a single state slot. The photo handlers keep only newPhotos[0],
// so a multi-select here uploads every file to Storage and then silently discards
// all but the first — leaving orphan photo rows and captions that no longer match
// the images in the PDF. iOS offers multi-select whenever the input allows it.
export const SINGLE_SLOT_PHOTO_TYPES = new Set([
  'single',
  'infrared',
  'naturalInfrared',
  'frontDoor',
  'frontHouse',
  'mailbox',
  'street',
  'direction',
])

export interface PhotoSlotCounts {
  roomView: number
  subfloor: number
}

/** Remaining capacity for a photo type. Infinity when the type has no limit. */
export function getRemainingPhotoSlots(
  type: string,
  counts: PhotoSlotCounts,
  hasMoistureReading: boolean
): number {
  if (hasMoistureReading) return 1
  if (type === 'roomView') return MAX_ROOM_VIEW_PHOTOS - counts.roomView
  if (type === 'subfloor') return MAX_SUBFLOOR_PHOTOS - counts.subfloor
  if (SINGLE_SLOT_PHOTO_TYPES.has(type)) return 1
  return Number.POSITIVE_INFINITY
}
