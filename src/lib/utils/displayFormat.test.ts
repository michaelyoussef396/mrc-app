import { describe, expect, it } from 'vitest';

import { toDisplayTitleCase } from './displayFormat';

describe('toDisplayTitleCase', () => {
  it('should title-case a fully lowercase name', () => {
    expect(toDisplayTitleCase('michael youssef')).toBe('Michael Youssef');
  });

  it('should title-case a fully uppercase name', () => {
    expect(toDisplayTitleCase('JOHN SMITH')).toBe('John Smith');
  });

  it('should preserve state abbreviations', () => {
    expect(toDisplayTitleCase('mernda VIC')).toBe('Mernda VIC');
  });

  it('should preserve a state abbreviation followed by punctuation', () => {
    expect(toDisplayTitleCase('mernda, VIC,')).toBe('Mernda, VIC,');
  });

  it('should leave tokens containing digits untouched', () => {
    expect(toDisplayTitleCase('35 wellington street, mernda, 3754')).toBe('35 Wellington Street, Mernda, 3754');
  });

  it('should preserve deliberate mixed casing', () => {
    expect(toDisplayTitleCase('Anna McDonald')).toBe('Anna McDonald');
  });

  it('should capitalise after an apostrophe', () => {
    expect(toDisplayTitleCase("sean o'brien")).toBe("Sean O'Brien");
  });

  it('should capitalise after a hyphen', () => {
    expect(toDisplayTitleCase('jean-luc picard')).toBe('Jean-Luc Picard');
  });

  it('should return an empty string unchanged', () => {
    expect(toDisplayTitleCase('')).toBe('');
  });

  it('should preserve internal whitespace exactly', () => {
    expect(toDisplayTitleCase('mary  jane')).toBe('Mary  Jane');
  });
});
