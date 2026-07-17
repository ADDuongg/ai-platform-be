import { StubAgentRunnerService } from './stub-agent-runner.service';

describe('StubAgentRunnerService', () => {
  const runner = new StubAgentRunnerService();

  it('returns deterministic stub output', async () => {
    const output = await runner.invoke({
      agentCode: 'research-agent',
      agentVersion: 1,
      nodeId: 'n1',
      input: { topic: 'x' },
      attempt: 1,
    });
    expect(output.result).toBe('stub:research-agent');
    expect(output.topic).toBe('x');
  });

  it('fails for configured failAttempts then succeeds', async () => {
    await expect(
      runner.invoke({
        agentCode: 'research-agent',
        agentVersion: 1,
        nodeId: 'n1',
        input: {},
        config: { failAttempts: 1 },
        attempt: 1,
      }),
    ).rejects.toThrow(/forced failure/);

    const ok = await runner.invoke({
      agentCode: 'research-agent',
      agentVersion: 1,
      nodeId: 'n1',
      input: {},
      config: { failAttempts: 1 },
      attempt: 2,
    });
    expect(ok.result).toBe('stub:research-agent');
  });

  it('returns structured fixtures for fashion trend research agents', async () => {
    const findings = await runner.invoke({
      agentCode: 'fashion-trend-research',
      agentVersion: 1,
      nodeId: 'node-trend-research',
      input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      attempt: 1,
    });
    expect(findings.trendFindings).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      trends: expect.any(Array),
    });
    expect((findings.trendFindings as { trends: unknown[] }).trends.length).toBeGreaterThan(0);

    const refs = await runner.invoke({
      agentCode: 'fashion-reference-collector',
      agentVersion: 1,
      nodeId: 'node-collect-references',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        trendFindings: findings.trendFindings,
      },
      attempt: 1,
    });
    expect(Array.isArray(refs.references)).toBe(true);
    expect((refs.references as unknown[]).length).toBeGreaterThan(0);

    const report = await runner.invoke({
      agentCode: 'fashion-research-report',
      agentVersion: 1,
      nodeId: 'node-research-report',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        trendFindings: findings.trendFindings,
        references: refs.references,
      },
      attempt: 1,
    });
    expect(report.researchReport).toMatchObject({
      summary: expect.any(String),
      trends: expect.any(Array),
      references: expect.any(Array),
      gaps: expect.any(Array),
    });
  });

  it('returns structured fixtures for fashion reference image agents', async () => {
    const search = await runner.invoke({
      agentCode: 'fashion-image-search',
      agentVersion: 1,
      nodeId: 'node-image-search',
      input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      attempt: 1,
    });
    expect(Array.isArray(search.imageCandidates)).toBe(true);
    expect((search.imageCandidates as unknown[]).length).toBeGreaterThan(0);
    expect((search.imageCandidates as Array<{ title: string }>)[0].title).toContain('SS27');

    const grouped = await runner.invoke({
      agentCode: 'fashion-reference-grouper',
      agentVersion: 1,
      nodeId: 'node-group-references',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        imageCandidates: search.imageCandidates,
      },
      attempt: 1,
    });
    expect(Array.isArray(grouped.groupedReferences)).toBe(true);
    expect((grouped.groupedReferences as unknown[]).length).toBeGreaterThan(0);
    expect(grouped.groupedReferences as Array<{ group: string }>).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ group: expect.any(String), items: expect.any(Array) }),
      ]),
    );

    const board = await runner.invoke({
      agentCode: 'fashion-inspiration-organizer',
      agentVersion: 1,
      nodeId: 'node-organize-inspiration',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        imageCandidates: search.imageCandidates,
        groupedReferences: grouped.groupedReferences,
      },
      attempt: 1,
    });
    expect(board.inspirationBoard).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      groups: expect.any(Array),
      references: expect.any(Array),
      notes: expect.any(Array),
    });
    expect((board.inspirationBoard as { groups: unknown[] }).groups.length).toBeGreaterThan(0);
  });

  it('returns structured fixtures for fashion style analysis agents', async () => {
    const color = await runner.invoke({
      agentCode: 'fashion-color-analyzer',
      agentVersion: 1,
      nodeId: 'node-color-analysis',
      input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      attempt: 1,
    });
    expect(color.colorAnalysis).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      findings: expect.any(Array),
    });
    expect(
      (color.colorAnalysis as { findings: Array<{ label: string }> }).findings.length,
    ).toBeGreaterThan(0);
    expect(
      (color.colorAnalysis as { findings: Array<{ label: string }> }).findings[0].label,
    ).toBeTruthy();
    expect(color).not.toHaveProperty('styleReport');

    const style = await runner.invoke({
      agentCode: 'fashion-style-analyzer',
      agentVersion: 1,
      nodeId: 'node-style-analysis',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        colorAnalysis: color.colorAnalysis,
      },
      attempt: 1,
    });
    expect(style.styleAnalysis).toMatchObject({
      summary: expect.any(String),
      findings: expect.any(Array),
    });
    expect(style).not.toHaveProperty('styleReport');

    const pattern = await runner.invoke({
      agentCode: 'fashion-pattern-analyzer',
      agentVersion: 1,
      nodeId: 'node-pattern-analysis',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        colorAnalysis: color.colorAnalysis,
        styleAnalysis: style.styleAnalysis,
      },
      attempt: 1,
    });
    expect(pattern.patternAnalysis).toMatchObject({
      summary: expect.any(String),
      findings: expect.any(Array),
    });
    expect(pattern).not.toHaveProperty('styleReport');

    const report = await runner.invoke({
      agentCode: 'fashion-illustration-analyzer',
      agentVersion: 1,
      nodeId: 'node-illustration-analysis',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        colorAnalysis: color.colorAnalysis,
        styleAnalysis: style.styleAnalysis,
        patternAnalysis: pattern.patternAnalysis,
      },
      attempt: 1,
    });
    expect(report.styleReport).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      colors: expect.any(Array),
      styles: expect.any(Array),
      patterns: expect.any(Array),
      illustrationNotes: expect.any(Array),
      recommendations: expect.any(Array),
    });
    const styleReport = report.styleReport as {
      colors: Array<{ label: string }>;
      styles: Array<{ label: string }>;
    };
    expect(styleReport.colors.length).toBeGreaterThan(0);
    expect(styleReport.styles.length).toBeGreaterThan(0);
    expect(styleReport.colors[0].label).toBeTruthy();
    expect(styleReport.styles[0].label).toBeTruthy();
  });

  it('returns structured fixtures for fashion design brief agents', async () => {
    const brief = await runner.invoke({
      agentCode: 'fashion-design-brief-writer',
      agentVersion: 1,
      nodeId: 'node-design-brief',
      input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      attempt: 1,
    });
    expect(brief.designBrief).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      themes: expect.any(Array),
      mustHaves: expect.any(Array),
      avoid: expect.any(Array),
    });
    const designBrief = brief.designBrief as {
      themes: Array<{ label: string }>;
      mustHaves: Array<{ label: string }>;
      avoid: Array<{ label: string }>;
    };
    expect(designBrief.themes.length).toBeGreaterThan(0);
    expect(designBrief.themes[0].label).toBeTruthy();
    expect(designBrief.mustHaves[0].label).toBeTruthy();
    expect(designBrief.avoid[0].label).toBeTruthy();
    expect(brief).not.toHaveProperty('designSpecification');

    const spec = await runner.invoke({
      agentCode: 'fashion-design-spec-writer',
      agentVersion: 1,
      nodeId: 'node-design-specification',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        designBrief: brief.designBrief,
      },
      attempt: 1,
    });
    expect(spec.designSpecification).toMatchObject({
      summary: expect.any(String),
      objectives: expect.any(Array),
      constraints: expect.any(Array),
      colorDirection: expect.any(Array),
      styleDirection: expect.any(Array),
      patternDirection: expect.any(Array),
      deliverables: expect.any(Array),
    });
    const designSpecification = spec.designSpecification as {
      objectives: Array<{ label: string }>;
      deliverables: Array<{ label: string }>;
    };
    expect(designSpecification.objectives.length).toBeGreaterThan(0);
    expect(designSpecification.deliverables.length).toBeGreaterThan(0);
    expect(designSpecification.objectives[0].label).toBeTruthy();
    expect(designSpecification.deliverables[0].label).toBeTruthy();
    // designBrief is mapped input (must be present); only designSpecification is newly produced
    expect(spec.designBrief).toEqual(brief.designBrief);
  });

  it('returns structured fixtures for fashion image generation agents', async () => {
    const prep = await runner.invoke({
      agentCode: 'fashion-image-prompt-prep',
      agentVersion: 1,
      nodeId: 'node-image-prompt-prep',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        designBrief: { summary: 'Playful color-block kids apparel' },
        designSpecification: { summary: 'Two concept artworks' },
      },
      attempt: 1,
    });
    expect(prep.imageGenPrompts).toMatchObject({
      summary: expect.any(String),
      prompts: expect.any(Array),
    });
    const imageGenPrompts = prep.imageGenPrompts as {
      prompts: Array<{ id: string; label: string; text: string }>;
    };
    expect(imageGenPrompts.prompts).toHaveLength(2);
    expect(imageGenPrompts.prompts[0].id).toBeTruthy();
    expect(imageGenPrompts.prompts[0].label).toBeTruthy();
    expect(imageGenPrompts.prompts[0].text).toBeTruthy();
    expect(prep).not.toHaveProperty('rawGenerations');
    expect(prep).not.toHaveProperty('generatedImages');

    const generate = await runner.invoke({
      agentCode: 'fashion-image-generator',
      agentVersion: 1,
      nodeId: 'node-image-generate',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        imageGenPrompts: prep.imageGenPrompts,
      },
      attempt: 1,
    });
    expect(Array.isArray(generate.rawGenerations)).toBe(true);
    const rawGenerations = generate.rawGenerations as Array<{
      id: string;
      label: string;
      promptRef?: string;
    }>;
    expect(rawGenerations).toHaveLength(2);
    expect(rawGenerations[0].id).toBeTruthy();
    expect(rawGenerations[0].label).toBeTruthy();
    expect(rawGenerations[0].promptRef).toBe(imageGenPrompts.prompts[0].id);
    expect(generate).not.toHaveProperty('generatedImages');

    const organize = await runner.invoke({
      agentCode: 'fashion-image-organizer',
      agentVersion: 1,
      nodeId: 'node-image-organize',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        rawGenerations: generate.rawGenerations,
        imageGenPrompts: prep.imageGenPrompts,
      },
      attempt: 1,
    });
    expect(organize.generatedImages).toMatchObject({
      summary: expect.stringContaining('kids-apparel'),
      variations: expect.any(Array),
    });
    const generatedImages = organize.generatedImages as {
      variations: Array<{ id: string; label: string }>;
    };
    expect(generatedImages.variations).toHaveLength(2);
    expect(generatedImages.variations[0].id).toBeTruthy();
    expect(generatedImages.variations[0].label).toBeTruthy();
    expect(organize.rawGenerations).toEqual(generate.rawGenerations);
  });

  it('returns structured fixtures for fashion design review agents', async () => {
    const generatedImages = {
      summary: 'Two playful color-block kids apparel concepts',
      variations: [
        {
          id: 'var-1',
          label: 'Cream base pastel blocks',
          promptRef: 'prompt-1',
          assetUrl: 'stub://generated/var-1.png',
        },
        {
          id: 'var-2',
          label: 'Soft geometric playground',
          promptRef: 'prompt-2',
          assetUrl: 'stub://generated/var-2.png',
        },
      ],
    };

    const quality = await runner.invoke({
      agentCode: 'fashion-quality-reviewer',
      agentVersion: 1,
      nodeId: 'node-quality-review',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        generatedImages,
      },
      attempt: 1,
    });
    expect(quality.qualityReview).toMatchObject({
      summary: expect.any(String),
      findings: expect.any(Array),
    });
    const qualityReview = quality.qualityReview as {
      findings: Array<{ id: string; label: string; variationRef?: string }>;
    };
    expect(qualityReview.findings.length).toBeGreaterThanOrEqual(1);
    expect(qualityReview.findings[0].id).toBeTruthy();
    expect(qualityReview.findings[0].label).toBeTruthy();
    expect(quality).not.toHaveProperty('improvementSuggestions');
    expect(quality).not.toHaveProperty('designReviewScore');

    const suggestions = await runner.invoke({
      agentCode: 'fashion-improvement-suggester',
      agentVersion: 1,
      nodeId: 'node-improvement-suggestions',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        qualityReview: quality.qualityReview,
        generatedImages,
      },
      attempt: 1,
    });
    expect(suggestions.improvementSuggestions).toMatchObject({
      summary: expect.any(String),
      suggestions: expect.any(Array),
    });
    const improvementSuggestions = suggestions.improvementSuggestions as {
      suggestions: Array<{ id: string; label: string }>;
    };
    expect(improvementSuggestions.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(improvementSuggestions.suggestions[0].id).toBeTruthy();
    expect(improvementSuggestions.suggestions[0].label).toBeTruthy();
    expect(suggestions).not.toHaveProperty('designReviewScore');

    const score = await runner.invoke({
      agentCode: 'fashion-design-scorer',
      agentVersion: 1,
      nodeId: 'node-design-score',
      input: {
        season: 'SS27',
        category: 'kids-apparel',
        market: 'VN',
        qualityReview: quality.qualityReview,
        improvementSuggestions: suggestions.improvementSuggestions,
        generatedImages,
      },
      attempt: 1,
    });
    expect(score.designReviewScore).toMatchObject({
      summary: expect.any(String),
      overallScore: expect.any(Number),
      perVariation: expect.any(Array),
    });
    const designReviewScore = score.designReviewScore as {
      overallScore: number;
      perVariation: Array<{ variationRef: string; score: number }>;
    };
    expect(designReviewScore.overallScore).toBeGreaterThanOrEqual(0);
    expect(designReviewScore.overallScore).toBeLessThanOrEqual(100);
    expect(designReviewScore.perVariation).toHaveLength(2);
    expect(designReviewScore.perVariation[0].variationRef).toBe('var-1');
    expect(designReviewScore.perVariation[1].variationRef).toBe('var-2');
    expect(score.qualityReview).toEqual(quality.qualityReview);
    expect(score.improvementSuggestions).toEqual(suggestions.improvementSuggestions);
  });
});
