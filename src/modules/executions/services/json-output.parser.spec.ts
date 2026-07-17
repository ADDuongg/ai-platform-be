import { MAX_LLM_RESPONSE_BYTES } from '../constants/executions.constants';
import {
  assertResponseSize,
  coerceOutputAgainstSchema,
  isNonTrivialSchema,
  parseModelJsonObject,
  validateAgainstOutputSchema,
} from './json-output.parser';

describe('json-output.parser', () => {
  it('parses raw JSON object', () => {
    expect(parseModelJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses fenced JSON', () => {
    expect(parseModelJsonObject('```json\n{"summary":"ok"}\n```')).toEqual({
      summary: 'ok',
    });
  });

  it('rejects non-object JSON', () => {
    expect(() => parseModelJsonObject('[1,2]')).toThrow(/JSON object/);
  });

  it('rejects oversize responses', () => {
    const big = 'x'.repeat(MAX_LLM_RESPONSE_BYTES + 1);
    expect(() => assertResponseSize(big)).toThrow(/exceeds max size/);
  });

  it('treats empty object schema as trivial', () => {
    expect(isNonTrivialSchema({})).toBe(false);
    expect(isNonTrivialSchema({ type: 'object' })).toBe(false);
  });

  it('validates required properties', () => {
    expect(() =>
      validateAgainstOutputSchema(
        {},
        {
          type: 'object',
          required: ['trendFindings'],
          properties: { trendFindings: { type: 'object' } },
        },
      ),
    ).toThrow(/missing required property "trendFindings"/);

    expect(() =>
      validateAgainstOutputSchema(
        { trendFindings: { summary: 'x', trends: [] } },
        {
          type: 'object',
          required: ['trendFindings'],
          properties: { trendFindings: { type: 'object' } },
        },
      ),
    ).not.toThrow();
  });

  const researchReportSchema = {
    type: 'object',
    required: ['researchReport'],
    properties: {
      researchReport: {
        type: 'object',
        required: ['summary', 'trends', 'references', 'gaps'],
        properties: {
          summary: { type: 'string' },
          trends: { type: 'array' },
          references: { type: 'array' },
          gaps: { type: 'array' },
        },
      },
    },
  };

  it('coerces stringified nested arrays to real arrays', () => {
    const raw = {
      researchReport: {
        summary: 'overview',
        trends: JSON.stringify([{ name: 'Sustainable Fashion', description: 'eco' }]),
        references: JSON.stringify([{ url: 'https://ex.com', title: 'T' }]),
        gaps: JSON.stringify([{ name: 'sizing', description: 'need standards' }]),
      },
    };

    const coerced = coerceOutputAgainstSchema(raw, researchReportSchema);
    expect(Array.isArray(coerced.researchReport)).toBe(false);
    const report = coerced.researchReport as Record<string, unknown>;
    expect(Array.isArray(report.trends)).toBe(true);
    expect(Array.isArray(report.references)).toBe(true);
    expect(Array.isArray(report.gaps)).toBe(true);
    expect((report.trends as unknown[])[0]).toMatchObject({ name: 'Sustainable Fashion' });
    expect(() => validateAgainstOutputSchema(coerced, researchReportSchema)).not.toThrow();
  });

  it('wraps flat researchReport fields into required envelope', () => {
    const flat = {
      summary: 'overview',
      trends: [{ name: 'A', description: 'B' }],
      references: [{ title: 'T', url: 'https://ex.com' }],
      gaps: ['missing data'],
    };
    const coerced = coerceOutputAgainstSchema(flat, researchReportSchema);
    expect(coerced.researchReport).toMatchObject({
      summary: 'overview',
      trends: [{ name: 'A', description: 'B' }],
    });
    expect(() => validateAgainstOutputSchema(coerced, researchReportSchema)).not.toThrow();
  });

  it('wraps flat trendFindings and coerces stringified trends', () => {
    const schema = {
      type: 'object',
      required: ['trendFindings'],
      properties: {
        trendFindings: {
          type: 'object',
          required: ['summary', 'trends'],
          properties: {
            summary: { type: 'string' },
            trends: { type: 'array' },
          },
        },
      },
    };
    const flat = {
      summary: 'kids SS27',
      trends: JSON.stringify([{ name: 'Bright', description: 'colors' }]),
    };
    const coerced = coerceOutputAgainstSchema(flat, schema);
    const findings = coerced.trendFindings as Record<string, unknown>;
    expect(findings.summary).toBe('kids SS27');
    expect(Array.isArray(findings.trends)).toBe(true);
    expect(() => validateAgainstOutputSchema(coerced, schema)).not.toThrow();
  });

  it('coerces non-array researchReport.trends to empty array', () => {
    const bad = {
      researchReport: {
        summary: 'overview',
        trends: 'not-json-array',
        references: [],
        gaps: [],
      },
    };
    const coerced = coerceOutputAgainstSchema(bad, researchReportSchema);
    expect((coerced.researchReport as { trends: unknown[] }).trends).toEqual([]);
    expect(() => validateAgainstOutputSchema(coerced, researchReportSchema)).not.toThrow();
  });

  it('wraps flat inspirationBoard and coerces null strings to empty', () => {
    const schema = {
      type: 'object',
      required: ['inspirationBoard'],
      properties: {
        inspirationBoard: {
          type: 'object',
          required: ['summary', 'groups', 'references', 'notes'],
          properties: {
            summary: { type: 'string' },
            groups: { type: 'array' },
            references: { type: 'array' },
            notes: { type: 'array' },
          },
        },
      },
    };
    const flat = {
      summary: null,
      groups: [{ group: 'Colorful', items: ['https://example.com/a'] }],
      notes: null,
    };
    const coerced = coerceOutputAgainstSchema(flat, schema);
    const board = coerced.inspirationBoard as Record<string, unknown>;
    expect(board.summary).toBe('');
    expect(Array.isArray(board.groups)).toBe(true);
    expect(board.notes).toEqual([]);
    expect(board.references).toEqual([]);
    expect((board.groups as Array<Record<string, unknown>>)[0].items).toEqual([
      { title: 'a', url: 'https://example.com/a' },
    ]);
    expect(() => validateAgainstOutputSchema(coerced, schema)).not.toThrow();
  });

  const groupedReferencesSchema = {
    type: 'object',
    required: ['groupedReferences'],
    properties: { groupedReferences: { type: 'array' } },
  };

  it('recovers duplicate group/items keys into groupedReferences', () => {
    const raw = `{
  "group": "Sustainable Fashion",
  "items": [
    {"url":"https://example.com/a"}
  ],
  "group": "Trend Forecasting",
  "items": [
    {"url":"https://example.com/b"}
  ]
}`;
    const parsed = parseModelJsonObject(raw);
    expect(parsed.groupedReferences).toEqual([
      { group: 'Sustainable Fashion', items: [{ url: 'https://example.com/a' }] },
      { group: 'Trend Forecasting', items: [{ url: 'https://example.com/b' }] },
    ]);
    const coerced = coerceOutputAgainstSchema(parsed, groupedReferencesSchema);
    expect(() => validateAgainstOutputSchema(coerced, groupedReferencesSchema)).not.toThrow();
  });

  it('does not overwrite inspirationBoard when nested group keys exist', () => {
    const raw = JSON.stringify({
      inspirationBoard: {
        summary: 'SS27 overview',
        groups: [
          { group: 'Retro Colorful', description: 'x', items: ['https://example.com/a'] },
          { group: 'Other', description: '', items: [] },
        ],
        references: [{ title: 'A', url: 'https://example.com/a' }],
        notes: '',
      },
    });
    const parsed = parseModelJsonObject(raw);
    expect(parsed.inspirationBoard).toBeDefined();
    expect(parsed.groupedReferences).toBeUndefined();

    const schema = {
      type: 'object',
      required: ['inspirationBoard'],
      properties: {
        inspirationBoard: {
          type: 'object',
          required: ['summary', 'groups', 'references', 'notes'],
          properties: {
            summary: { type: 'string' },
            groups: { type: 'array' },
            references: { type: 'array' },
            notes: { type: 'array' },
          },
        },
      },
    };
    const coerced = coerceOutputAgainstSchema(parsed, schema);
    const board = coerced.inspirationBoard as Record<string, unknown>;
    expect(board.summary).toBe('SS27 overview');
    expect(board.notes).toEqual([]);
    expect(() => validateAgainstOutputSchema(coerced, schema)).not.toThrow();
  });

  it('normalizes theme-map groupedReferences entries', () => {
    const coerced = coerceOutputAgainstSchema(
      {
        groupedReferences: [
          {
            'Retro Colorful': ['https://example.com/a', 'https://example.com/b'],
          },
        ],
      },
      groupedReferencesSchema,
    );
    expect(coerced.groupedReferences).toEqual([
      {
        group: 'Retro Colorful',
        items: ['https://example.com/a', 'https://example.com/b'],
      },
    ]);
  });

  it('wraps single { group, items } into groupedReferences array', () => {
    const coerced = coerceOutputAgainstSchema(
      { group: 'Color', items: ['https://example.com/a'] },
      groupedReferencesSchema,
    );
    expect(coerced.groupedReferences).toEqual([
      { group: 'Color', items: ['https://example.com/a'] },
    ]);
    expect(() => validateAgainstOutputSchema(coerced, groupedReferencesSchema)).not.toThrow();
  });

  it('wraps bare array of groups into groupedReferences', () => {
    const parsed = parseModelJsonObject(
      `[{"group":"A","items":["https://a.com"]},{"group":"B","items":["https://b.com"]}]`,
    );
    expect(parsed.groupedReferences).toHaveLength(2);
  });

  it('maps group1/group2 keyed arrays into groupedReferences', () => {
    const coerced = coerceOutputAgainstSchema(
      {
        group1: [{ url: 'https://example.com/a' }],
        group2: [{ url: 'https://example.com/b' }],
      },
      groupedReferencesSchema,
    );
    expect(coerced.groupedReferences).toEqual([
      { group: 'Group 1', items: [{ url: 'https://example.com/a' }] },
      { group: 'Group 2', items: [{ url: 'https://example.com/b' }] },
    ]);
    expect(() => validateAgainstOutputSchema(coerced, groupedReferencesSchema)).not.toThrow();
  });

  it('normalizes styleReport nested findings and null lists for FE', () => {
    const schema = {
      type: 'object',
      required: ['styleReport'],
      properties: {
        styleReport: {
          type: 'object',
          required: [
            'summary',
            'colors',
            'styles',
            'patterns',
            'illustrationNotes',
            'recommendations',
          ],
          properties: {
            summary: { type: 'string' },
            colors: { type: 'array' },
            styles: { type: 'array' },
            patterns: { type: 'array' },
            illustrationNotes: { type: 'array' },
            recommendations: { type: 'array' },
          },
        },
      },
    };
    const coerced = coerceOutputAgainstSchema(
      {
        styleReport: {
          summary: 'SS27',
          colors: { summary: '', findings: [{ label: 'Pastel', notes: 'soft' }] },
          styles: { findings: [{ label: 'Playful' }] },
          patterns: { findings: [] },
          illustrationNotes: null,
          recommendations: null,
        },
      },
      schema,
    );
    const report = coerced.styleReport as Record<string, unknown>;
    expect(report.colors).toEqual([{ label: 'Pastel', notes: 'soft' }]);
    expect(report.styles).toEqual([{ label: 'Playful' }]);
    expect(report.illustrationNotes).toEqual([]);
    expect(report.recommendations).toEqual([]);
    expect(() => validateAgainstOutputSchema(coerced, schema)).not.toThrow();
  });

  it('normalizes image-generation handoff shapes for FE', () => {
    const coerced = coerceOutputAgainstSchema(
      {
        imageGenPrompts: {
          summary: 'concept',
          prompts: [{ id: 1, label: '', text: 'color-block kids tee' }],
        },
        rawGenerations: {
          '0': {
            id: 1,
            label: '',
            assetUrl: 'stub-live://image-generation/var-1.png',
          },
        },
        generatedImages: {
          summary: 'concept',
          variations: [
            {
              id: 2,
              label: '',
              assetUrl: 'stub-live://image-generation/var-2.png',
            },
          ],
        },
      },
      { type: 'object' },
    );

    const prompts = (coerced.imageGenPrompts as { prompts: Array<Record<string, unknown>> })
      .prompts;
    expect(prompts[0]).toMatchObject({ id: '1', label: 'Variation 1' });
    expect(Array.isArray(coerced.rawGenerations)).toBe(true);
    expect((coerced.rawGenerations as Array<Record<string, unknown>>)[0].id).toBe('1');
    const images = coerced.generatedImages as { variations: Array<Record<string, unknown>> };
    expect(images.variations[0]).toMatchObject({
      id: '2',
      assetUrl: expect.stringContaining('var-2'),
    });
  });

  it('normalizes researchReport / designBrief / design-review handoffs for FE', () => {
    const coerced = coerceOutputAgainstSchema(
      {
        researchReport: {
          summary: 'SS27',
          trends: null,
          references: ['https://example.com/a'],
          gaps: [{ label: 'Missing silhouette coverage' }],
        },
        designBrief: {
          summary: 'Brief',
          themes: { findings: [{ name: 'Play' }] },
          mustHaves: null,
          avoid: [{ title: 'Neon overload' }],
        },
        designSpecification: {
          summary: 'Spec',
          objectives: null,
          constraints: [{ label: 'Age 3-8' }],
          colorDirection: null,
          styleDirection: null,
          patternDirection: null,
          deliverables: null,
        },
        qualityReview: {
          summary: 'OK',
          findings: [{ id: 1, label: 'Contrast too low' }],
        },
        improvementSuggestions: {
          summary: 'Tune',
          suggestions: [{ id: 2, name: 'Increase block size' }],
        },
        designReviewScore: {
          summary: 'Score',
          overallScore: '8.5',
          perVariation: [{ variationRef: 1, score: '7' }],
          criteria: [{ id: 3, label: 'Color', score: '9' }],
          notes: null,
        },
      },
      { type: 'object' },
    );

    const report = coerced.researchReport as Record<string, unknown>;
    expect(report.trends).toEqual([]);
    expect(report.references).toEqual([{ title: 'a', url: 'https://example.com/a' }]);
    expect(report.gaps).toEqual(['Missing silhouette coverage']);

    const brief = coerced.designBrief as Record<string, unknown>;
    expect(brief.themes).toEqual([{ label: 'Play' }]);
    expect(brief.mustHaves).toEqual([]);
    expect(brief.avoid).toEqual([{ label: 'Neon overload' }]);

    const spec = coerced.designSpecification as Record<string, unknown>;
    expect(spec.objectives).toEqual([]);
    expect(spec.constraints).toEqual([{ label: 'Age 3-8' }]);

    const quality = coerced.qualityReview as { findings: Array<Record<string, unknown>> };
    expect(quality.findings[0]).toMatchObject({ id: '1', label: 'Contrast too low' });

    const suggestions = coerced.improvementSuggestions as {
      suggestions: Array<Record<string, unknown>>;
    };
    expect(suggestions.suggestions[0]).toMatchObject({
      id: '2',
      label: 'Increase block size',
    });

    const score = coerced.designReviewScore as Record<string, unknown>;
    expect(score.overallScore).toBe(8.5);
    expect(score.perVariation).toEqual([{ variationRef: '1', score: 7 }]);
    expect(score.criteria).toEqual([{ id: '3', label: 'Color', score: 9 }]);
  });
});
