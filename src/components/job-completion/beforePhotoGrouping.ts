// Grouping for the Section 3 before-photo grid.
//
// Two kinds of photo share this grid and they are removed differently. A photo
// picked from the inspection is deselected — clearing job_completion_id and
// photo_category — and stays with the inspection. A photo uploaded at job time
// exists only because of this job, so it is deleted instead; deselecting it
// would drop an unreferenced row into the inspection's general pool, where the
// admin photo picker can claim it and the inspection report can pick it up as a
// cover image.

/** Photo row enriched with a short-lived signed URL for display */
export interface PhotoWithUrl {
  id: string
  /** Null for a photo uploaded on a job whose lead never had an inspection. */
  inspection_id: string | null
  storage_path: string
  caption: string | null
  area_id: string | null
  area_name: string | null
  photo_type: string | null
  photo_category: string | null
  job_completion_id: string | null
  signed_url: string
}

export interface PhotoGroup {
  key: string
  label: string
  photos: PhotoWithUrl[]
}

/** Photos the technician shot at job time rather than picked from the inspection. */
export const ONSITE_GROUP_KEY = 'onsite'

/**
 * Best available row-level signal that a photo was uploaded here rather than
 * picked from the inspection.
 *
 * It is a heuristic, and deliberately so. Picking an inspection photo writes
 * the same `job_completion_id` and `photo_category = 'before'` an upload is
 * born with, so the only remaining discriminator is `photo_type`: the
 * inspection form never writes 'general' (every branch that would leave the
 * default also leaves the caption unset and bails before inserting), whereas
 * every upload from this section does.
 *
 * The residual false positive is a genuinely general inspection photo — an
 * unplaced outdoor photo, or an admin cover upload — that the technician then
 * picks. It would be offered Delete instead of Deselect. That is a soft delete
 * and recoverable, and it is the lesser of the two errors: the alternative is
 * treating a real upload as a picked photo, whose deselect drops an
 * unreferenced row into the inspection's general pool where it can become the
 * inspection report's cover image.
 *
 * Making this exact rather than heuristic needs a provenance column on photos,
 * which is a schema change and tracked separately.
 */
export function isLikelyOnsiteUpload(
  photo: PhotoWithUrl,
  jobCompletionId: string | null
): boolean {
  return (
    !!jobCompletionId &&
    photo.job_completion_id === jobCompletionId &&
    photo.photo_category === 'before' &&
    photo.photo_type === 'general'
  )
}

/**
 * Group photos for display, on-site uploads first.
 *
 * `onsiteIds` is supplied by the caller rather than derived from the row,
 * because a row cannot say where it came from: picking an inspection photo
 * writes exactly the two fields an uploaded photo is born with —
 * `job_completion_id` and `photo_category = 'before'`.
 */
export function groupPhotos(
  photos: PhotoWithUrl[],
  onsiteIds: ReadonlySet<string>
): PhotoGroup[] {
  const areaMap = new Map<string, PhotoWithUrl[]>()
  const onsite: PhotoWithUrl[] = []
  const subfloor: PhotoWithUrl[] = []
  const outdoor: PhotoWithUrl[] = []
  const general: PhotoWithUrl[] = []

  for (const photo of photos) {
    const type = photo.photo_type ?? 'general'

    if (onsiteIds.has(photo.id)) {
      onsite.push(photo)
    } else if (type === 'area' && photo.area_id) {
      const key = photo.area_id
      if (!areaMap.has(key)) areaMap.set(key, [])
      areaMap.get(key)!.push(photo)
    } else if (type === 'subfloor') {
      subfloor.push(photo)
    } else if (type === 'outdoor') {
      outdoor.push(photo)
    } else {
      general.push(photo)
    }
  }

  const groups: PhotoGroup[] = []

  if (onsite.length > 0) {
    groups.push({ key: ONSITE_GROUP_KEY, label: 'Photos you added on site', photos: onsite })
  }

  for (const [areaId, areaPhotos] of areaMap) {
    const name = areaPhotos[0]?.area_name ?? 'Unknown Area'
    groups.push({ key: `area-${areaId}`, label: name, photos: areaPhotos })
  }

  if (subfloor.length > 0) {
    groups.push({ key: 'subfloor', label: 'Subfloor', photos: subfloor })
  }
  if (outdoor.length > 0) {
    groups.push({ key: 'outdoor', label: 'Outdoor / External', photos: outdoor })
  }
  if (general.length > 0) {
    groups.push({ key: 'general', label: 'General', photos: general })
  }

  return groups
}
