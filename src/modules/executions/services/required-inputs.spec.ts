import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';
import type { WorkflowDefinition } from '@modules/workflows/types';

import { assertRequiredInputs, extractRequiredInputs, isBlankInputValue } from './required-inputs';

describe('required-inputs', () => {
  const definitionWithRequired = {
    nodes: [],
    edges: [],
    variables: {},
    policies: { requiredInputs: ['season', 'category', 'market'] },
  } satisfies WorkflowDefinition;

  describe('extractRequiredInputs', () => {
    it('returns empty when policies absent or non-array', () => {
      expect(extractRequiredInputs(undefined)).toEqual([]);
      expect(
        extractRequiredInputs({
          nodes: [],
          edges: [],
          variables: {},
          policies: {},
        }),
      ).toEqual([]);
      expect(
        extractRequiredInputs({
          nodes: [],
          edges: [],
          variables: {},
          policies: { requiredInputs: 'season' },
        }),
      ).toEqual([]);
    });

    it('returns string keys only', () => {
      expect(extractRequiredInputs(definitionWithRequired)).toEqual([
        'season',
        'category',
        'market',
      ]);
    });
  });

  describe('isBlankInputValue', () => {
    it('treats null/undefined/whitespace string as blank', () => {
      expect(isBlankInputValue(undefined)).toBe(true);
      expect(isBlankInputValue(null)).toBe(true);
      expect(isBlankInputValue('')).toBe(true);
      expect(isBlankInputValue('  ')).toBe(true);
      expect(isBlankInputValue('SS27')).toBe(false);
      expect(isBlankInputValue(0)).toBe(false);
      expect(isBlankInputValue(false)).toBe(false);
    });
  });

  describe('assertRequiredInputs', () => {
    it('no-ops when no required keys', () => {
      expect(() =>
        assertRequiredInputs({ nodes: [], edges: [], variables: {}, policies: {} }, {}),
      ).not.toThrow();
    });

    it('rejects missing and blank keys with VALIDATION_ERROR', () => {
      try {
        assertRequiredInputs(definitionWithRequired, {
          season: 'SS27',
          category: '  ',
        });
        fail('expected throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        const appError = error as AppException;
        expect(appError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(appError.getResponse()).toMatchObject({
          code: ERROR_CODES.VALIDATION_ERROR,
          details: {
            missing: ['market'],
            blank: ['category'],
            required: ['season', 'category', 'market'],
          },
        });
      }
    });

    it('passes when all required keys are non-blank', () => {
      expect(() =>
        assertRequiredInputs(definitionWithRequired, {
          season: 'SS27',
          category: 'kids-apparel',
          market: 'VN',
        }),
      ).not.toThrow();
    });
  });
});
