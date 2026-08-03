import { describe, expect, it } from 'vitest';

import { findSummaryFlags } from './summaryChecks';

describe('findSummaryFlags', () => {
  it('should flag the observed antimicrobial claim when Surface Remediation Treatment is off', () => {
    expect(
      findSummaryFlags(
        {
          whatWeWillDo:
            'A broad-spectrum antimicrobial solution will then be applied to kill any remaining mould spores',
        },
        ['HEPA Vacuuming', 'Drying Equipment'],
        false,
      ),
    ).toEqual([{ label: 'Surface Remediation Treatment', section: 'whatWeWillDo' }]);
  });

  it('should flag the observed clearance air test claim', () => {
    expect(
      findSummaryFlags(
        {
          whatWeWillDo:
            'A final clearance air test will be conducted to confirm the successful restoration of healthy air quality',
        },
        [],
        false,
      ),
    ).toEqual([{ label: 'Clearance or air-quality testing (not an MRC service)', section: 'whatWeWillDo' }]);
  });

  it('should not flag the mandated phrase "air quality restoration"', () => {
    expect(
      findSummaryFlags({ whatWeWillDo: 'Our goal is the full air quality restoration of your home.' }, [], false),
    ).toEqual([]);
  });

  it('should not flag Cavity Treatment for cause analysis mentioning a wall cavity', () => {
    expect(
      findSummaryFlags({ detailedAnalysis: 'Moisture in the wall cavity is driving the growth.' }, [], false),
    ).toEqual([]);
  });

  it('should not flag Subfloor Remediation for a bare mention of the subfloor', () => {
    expect(
      findSummaryFlags({ whatWeFound: 'Elevated moisture was recorded in the subfloor.' }, [], false),
    ).toEqual([]);
  });

  it('should not flag HEPA Vacuuming for a bare HEPA Air Scrubber mention', () => {
    expect(
      findSummaryFlags({ whatWeWillDo: 'A HEPA Air Scrubber will run for four days.' }, [], false).map(
        (flag) => flag.label,
      ),
    ).not.toContain('HEPA Vacuuming');
  });

  it('should suppress a mention when the matching method is selected', () => {
    expect(
      findSummaryFlags(
        { whatWeWillDo: 'A broad-spectrum antimicrobial solution will be applied.' },
        ['Surface Remediation Treatment'],
        false,
      ),
    ).toEqual([]);
  });

  it('should match selected methods case-insensitively after trimming', () => {
    expect(
      findSummaryFlags(
        { whatWeWillDo: 'A broad-spectrum antimicrobial solution will be applied.' },
        ['  surface remediation treatment '],
        false,
      ),
    ).toEqual([]);
  });

  it('should suppress demolition wording when the job has demolition', () => {
    expect(
      findSummaryFlags({ demolitionDetails: 'Affected plasterboard will be removed by demolition.' }, [], true),
    ).toEqual([]);
  });

  it('should flag demolition wording when the job has no demolition', () => {
    expect(
      findSummaryFlags({ demolitionDetails: 'Affected plasterboard will be removed by demolition.' }, [], false),
    ).toEqual([{ label: 'Material Demolition', section: 'demolitionDetails' }]);
  });

  it('should never flag drying-equipment wording', () => {
    expect(
      findSummaryFlags({ whatWeWillDo: 'Drying equipment will run on site for four days.' }, [], false),
    ).toEqual([]);
  });

  it('should flag ULV fogging when neither fogging method is selected', () => {
    expect(
      findSummaryFlags({ whatWeWillDo: 'ULV fogging will be applied throughout the property.' }, [], false),
    ).toEqual([{ label: 'ULV Fogging', section: 'whatWeWillDo' }]);
  });

  it('should suppress ULV fogging when the subfloor variant is selected', () => {
    expect(
      findSummaryFlags(
        { whatWeWillDo: 'ULV fogging will be applied throughout the subfloor.' },
        ['ULV Fogging - Subfloor'],
        false,
      ),
    ).toEqual([]);
  });

  it('should always flag an unresolved data conflict', () => {
    expect(
      findSummaryFlags({ detailedAnalysis: 'DATA CONFLICT: two moisture readings disagree.' }, [], false),
    ).toEqual([{ label: 'Unresolved data conflict', section: 'detailedAnalysis' }]);
  });

  it('should emit one flag when the same service is mentioned twice in a section', () => {
    expect(
      findSummaryFlags(
        { whatWeWillDo: 'An antimicrobial solution is applied, then a second antimicrobial pass follows.' },
        [],
        false,
      ),
    ).toHaveLength(1);
  });

  it('should attribute a flag to the section that mentioned it', () => {
    expect(
      findSummaryFlags({ detailedAnalysis: 'An antimicrobial solution will be applied.' }, [], false)[0].section,
    ).toBe('detailedAnalysis');
  });

  it('should order flags by section declaration order', () => {
    expect(
      findSummaryFlags(
        {
          whatWeWillDo: 'A final clearance air test will be conducted.',
          whatWeFound: 'An antimicrobial solution had been applied previously.',
        },
        [],
        false,
      ).map((flag) => flag.section),
    ).toEqual(['whatWeFound', 'whatWeWillDo']);
  });

  it('should return no flags for an empty section map', () => {
    expect(findSummaryFlags({}, [], false)).toEqual([]);
  });

  it('should skip empty section strings', () => {
    expect(findSummaryFlags({ whatWeFound: '', whatWeWillDo: '' }, [], false)).toEqual([]);
  });
});
