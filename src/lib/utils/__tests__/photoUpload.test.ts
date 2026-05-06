// Stage 4.1 caption-required gate
//
// validatePhotoCaption() is called from queuePhotoOffline() and
// uploadInspectionPhoto() before any Storage write or photos-row INSERT,
// and from SyncManager.syncPhoto() on dequeue. These tests pin the gate's
// behaviour so a caller can never sneak a captionless row past it.

import { describe, it, expect } from 'vitest'
import {
  validatePhotoCaption,
  PhotoCaptionRequiredError,
} from '../photoUpload'

describe('validatePhotoCaption', () => {
  it('throws PhotoCaptionRequiredError when caption is undefined', () => {
    expect(() => validatePhotoCaption(undefined)).toThrow(PhotoCaptionRequiredError)
  })

  it('throws PhotoCaptionRequiredError when caption is null', () => {
    expect(() => validatePhotoCaption(null)).toThrow(PhotoCaptionRequiredError)
  })

  it('throws PhotoCaptionRequiredError when caption is an empty string', () => {
    expect(() => validatePhotoCaption('')).toThrow(PhotoCaptionRequiredError)
  })

  it('throws PhotoCaptionRequiredError when caption is whitespace only', () => {
    expect(() => validatePhotoCaption('   \t\n  ')).toThrow(PhotoCaptionRequiredError)
  })

  it('accepts a non-empty trimmed caption', () => {
    expect(() => validatePhotoCaption('Mould on bathroom ceiling')).not.toThrow()
  })

  it('accepts a sentinel role tag as a valid caption', () => {
    // Sentinel captions ('infrared', 'front_house', 'moisture', etc.) are
    // emitted by TechnicianInspectionForm for non-room photos and must pass
    // the same gate without requiring a human-readable description.
    expect(() => validatePhotoCaption('infrared')).not.toThrow()
  })
})

describe('PhotoCaptionRequiredError', () => {
  it('has name set to PhotoCaptionRequiredError', () => {
    const err = new PhotoCaptionRequiredError()
    expect(err.name).toBe('PhotoCaptionRequiredError')
  })

  it('extends Error so existing catch (err: Error) handlers still match', () => {
    const err = new PhotoCaptionRequiredError()
    expect(err).toBeInstanceOf(Error)
  })
})
