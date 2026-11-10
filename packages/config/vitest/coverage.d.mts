export interface CoverageOptions {
  provider: 'v8';
  enabled: boolean;
  reporter: string[];
  reportsDirectory: string;
  include: string[];
  exclude: string[];
}

export function coverage(directory: 'unit' | 'integration'): CoverageOptions;
