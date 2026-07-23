import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AllConfigType } from '@common/config';

import {
  SEARCH_PROVIDER_CATALOG,
  type SearchProviderCatalogEntry,
} from '../constants/search-provider-catalog.constant';
import { SearchProviderDto } from '../dto/search-provider.dto';

@Injectable()
export class SearchProviderCatalogService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  listProviders(): SearchProviderDto[] {
    return SEARCH_PROVIDER_CATALOG.map((entry) => this.toDto(entry));
  }

  private toDto(entry: SearchProviderCatalogEntry): SearchProviderDto {
    return {
      id: entry.id,
      label: entry.label,
      configured: this.isConfigured(entry),
      canBeFallback: entry.canBeFallback,
      ...(entry.engines ? { engines: [...entry.engines] } : {}),
    };
  }

  private isConfigured(entry: SearchProviderCatalogEntry): boolean {
    if (!entry.requiresEnv?.length) {
      return true;
    }
    if (entry.id === 'serpapi') {
      const key = this.configService.get('toolRuntime', { infer: true })?.serpapi?.apiKey?.trim();
      return Boolean(key);
    }
    if (entry.id === 'tavily') {
      const key = this.configService.get('toolRuntime', { infer: true })?.tavily?.apiKey?.trim();
      return Boolean(key);
    }
    return entry.requiresEnv.every((name) => Boolean(process.env[name]?.trim()));
  }
}
