// Before-photo grouping and on-site classification.
//
// Section 3 holds two kinds of photo with different removal semantics: photos
// picked from the inspection are deselected (clearing job_completion_id and
// photo_category), while photos uploaded at job time are deleted. Getting that
// wrong orphans an uploaded photo into the inspection's general pool, where the
// admin picker can claim it and the inspection report can pick it up as a cover.
//
// The classification cannot come from the row — picking writes exactly the two
// fields an upload is born with — so groupPhotos takes the set of ids uploaded
// in this session. These tests pin that contract.

import { describe, it, expect } from 'vitest'
import { groupPhotos, isLikelyOnsiteUpload, type PhotoWithUrl } from '../beforePhotoGrouping'

const JOB_ID = 'job-completion-1'

function makePhoto(overrides: Partial<PhotoWithUrl> = {}): PhotoWithUrl {
  return {
    id: 'photo-1',
    inspection_id: 'inspection-1',
    storage_path: 'inspection-1/photo-1.jpg',
    caption: null,
    area_id: null,
    area_name: null,
    photo_type: 'general',
    photo_category: null,
    job_completion_id: null,
    signed_url: 'https://example.test/photo-1.jpg',
    ...overrides,
  }
}

/** What a photo picked from the inspection looks like once it is selected. */
function makePickedPhoto(overrides: Partial<PhotoWithUrl> = {}): PhotoWithUrl {
  return makePhoto({
    job_completion_id: JOB_ID,
    photo_category: 'before',
    ...overrides,
  })
}

describe('groupPhotos', () => {
  it('puts an uploaded photo in its own group', () => {
    const uploaded = makePickedPhoto({ id: 'onsite-1' })
    expect(groupPhotos([uploaded], new Set(['onsite-1']))[0].key).toBe('onsite')
  })

  it('labels the on-site group for the technician', () => {
    const uploaded = makePickedPhoto({ id: 'onsite-1' })
    expect(groupPhotos([uploaded], new Set(['onsite-1']))[0].label).toBe('Photos you added on site')
  })

  it('lists the on-site group before the inspection groups', () => {
    const areaPhoto = makePhoto({ id: 'area-photo', photo_type: 'area', area_id: 'area-1' })
    const uploaded = makePickedPhoto({ id: 'onsite-1' })
    const keys = groupPhotos([areaPhoto, uploaded], new Set(['onsite-1'])).map((g) => g.key)
    expect(keys).toEqual(['onsite', 'area-area-1'])
  })

  it('keeps a picked area photo out of the on-site group', () => {
    const picked = makePickedPhoto({ id: 'picked-1', photo_type: 'area', area_id: 'area-1' })
    expect(groupPhotos([picked], new Set())[0].key).toBe('area-area-1')
  })

  it('keeps a picked general photo out of the on-site group', () => {
    // The regression this guards: a picked general photo is field-for-field
    // identical to an upload, so only the session id set separates them.
    const picked = makePickedPhoto({ id: 'picked-general' })
    expect(groupPhotos([picked], new Set())[0].key).toBe('general')
  })

  it('omits the on-site group when nothing was uploaded in this session', () => {
    const areaPhoto = makePhoto({ photo_type: 'area', area_id: 'area-1' })
    const keys = groupPhotos([areaPhoto], new Set()).map((g) => g.key)
    expect(keys).not.toContain('onsite')
  })

  it('groups subfloor photos separately', () => {
    const subfloor = makePhoto({ id: 'sub-1', photo_type: 'subfloor' })
    expect(groupPhotos([subfloor], new Set())[0].key).toBe('subfloor')
  })

  it('groups outdoor photos separately', () => {
    const outdoor = makePhoto({ id: 'out-1', photo_type: 'outdoor' })
    expect(groupPhotos([outdoor], new Set())[0].key).toBe('outdoor')
  })

  it('names an area group after its area', () => {
    const areaPhoto = makePhoto({ photo_type: 'area', area_id: 'area-1', area_name: 'Bathroom' })
    expect(groupPhotos([areaPhoto], new Set())[0].label).toBe('Bathroom')
  })
})

describe('isLikelyOnsiteUpload', () => {
  it('recognises a general before photo belonging to this job completion', () => {
    const uploaded = makePickedPhoto({ photo_type: 'general' })
    expect(isLikelyOnsiteUpload(uploaded, JOB_ID)).toBe(true)
  })

  it('rejects a picked area photo, which is never born as general', () => {
    const picked = makePickedPhoto({ photo_type: 'area', area_id: 'area-1' })
    expect(isLikelyOnsiteUpload(picked, JOB_ID)).toBe(false)
  })

  it('rejects a picked subfloor photo', () => {
    expect(isLikelyOnsiteUpload(makePickedPhoto({ photo_type: 'subfloor' }), JOB_ID)).toBe(false)
  })

  it('rejects a photo that belongs to a different job completion', () => {
    const other = makePickedPhoto({ photo_type: 'general', job_completion_id: 'other-job' })
    expect(isLikelyOnsiteUpload(other, JOB_ID)).toBe(false)
  })

  it('rejects an unselected inspection photo', () => {
    expect(isLikelyOnsiteUpload(makePhoto(), JOB_ID)).toBe(false)
  })

  it('rejects an after photo', () => {
    const after = makePickedPhoto({ photo_type: 'general', photo_category: 'after' })
    expect(isLikelyOnsiteUpload(after, JOB_ID)).toBe(false)
  })

  it('classifies nothing before the job completion row exists', () => {
    expect(isLikelyOnsiteUpload(makePickedPhoto({ photo_type: 'general' }), null)).toBe(false)
  })
})

// A lead can reach job completion without ever having an inspection. The
// before photos a technician uploads on those jobs carry inspection_id = null,
// and they are the only photos the job report will have.
describe('photos on a job with no inspection', () => {
  function makeNoInspectionUpload(overrides: Partial<PhotoWithUrl> = {}): PhotoWithUrl {
    return makePhoto({
      id: 'onsite-no-insp',
      inspection_id: null,
      storage_path: `job-${JOB_ID}/onsite-no-insp.jpg`,
      job_completion_id: JOB_ID,
      photo_category: 'before',
      photo_type: 'general',
      ...overrides,
    })
  }

  it('classifies an upload with no inspection as an on-site photo', () => {
    expect(isLikelyOnsiteUpload(makeNoInspectionUpload(), JOB_ID)).toBe(true)
  })

  it('puts an upload with no inspection in the on-site group', () => {
    const uploaded = makeNoInspectionUpload()
    const groups = groupPhotos([uploaded], new Set([uploaded.id]))
    expect(groups[0].key).toBe('onsite')
  })

  it('keeps an upload with no inspection out of the general group', () => {
    const uploaded = makeNoInspectionUpload()
    const keys = groupPhotos([uploaded], new Set([uploaded.id])).map((g) => g.key)
    expect(keys).not.toContain('general')
  })

  it('leaves an upload with no inspection ungrouped when the caller omits its id', () => {
    const uploaded = makeNoInspectionUpload()
    expect(groupPhotos([uploaded], new Set()).map((g) => g.key)).toEqual(['general'])
  })
})
