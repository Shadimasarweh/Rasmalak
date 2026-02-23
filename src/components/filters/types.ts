import { ReactNode } from 'react';

export interface FilterOption {
  value: string;
  labelKey: string;
  labelDefault: string;
  icon?: ReactNode;
}

export interface FilterSectionConfig {
  key: string;
  titleKey: string;
  titleDefault: string;
  type: 'multi' | 'single';
  variant?: 'list' | 'searchable';
  options: FilterOption[];
  defaultValues?: string[];
}

export interface FilterConfig {
  pageId: string;
  sections: FilterSectionConfig[];
}
