import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProviderDto {
  @ApiProperty({
    example: 'serpapi',
    enum: ['serpapi', 'tavily', 'duckduckgo', 'google-cse', 'gemini'],
  })
  id!: string;

  @ApiProperty({ example: 'SerpAPI' })
  label!: string;

  @ApiProperty({
    description: 'True when required env credentials are present (DuckDuckGo always true)',
    example: true,
  })
  configured!: boolean;

  @ApiProperty({
    description: 'May be selected as fallbackProvider in tool config',
    example: true,
  })
  canBeFallback!: boolean;

  @ApiPropertyOptional({
    description: 'Engine options for this provider (e.g. SerpAPI)',
    type: [String],
    example: ['google_shopping', 'google'],
  })
  engines?: string[];
}
