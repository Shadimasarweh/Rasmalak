'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useIntl } from 'react-intl';
import { useShallow } from 'zustand/react/shallow';
import { useFilterStore } from './useFilterStore';
import { useFilterURL } from './useFilterURL';
import { FilterButton } from './FilterButton';
import { FilterSection } from './FilterSection';
import { FilterCheckbox } from './FilterCheckbox';
import { FilterRadio } from './FilterRadio';
import { FilterSearchSelect } from './FilterSearchSelect';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import type { FilterConfig, FilterSectionConfig } from './types';

const EMPTY_FILTERS: Record<string, string[]> = {};

interface FilterPanelProps {
  config: FilterConfig;
  defaultOpen?: boolean;
}

function FilterPanelInner({ config, defaultOpen = false }: FilterPanelProps) {
  const { pageId, sections } = config;
  const intl = useIntl();
  const filters = useFilterStore(
    useShallow((s) => s.filters[pageId] ?? EMPTY_FILTERS),
  );
  const toggleFilter = useFilterStore((s) => s.toggleFilter);
  const setFilter = useFilterStore((s) => s.setFilter);
  const clearAll = useFilterStore((s) => s.clearAll);

  useFilterURL(config);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const activeCount = Object.values(filters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Measure panel content height for animation
  useEffect(() => {
    if (panelRef.current) {
      setPanelHeight(panelRef.current.scrollHeight);
    }
  }, [isOpen, filters]);

  const handleToggle = useCallback(() => setIsOpen((p) => !p), []);
  const handleClearAll = useCallback(() => clearAll(pageId), [clearAll, pageId]);

  const handleToggleOption = useCallback(
    (sectionKey: string, value: string) => toggleFilter(pageId, sectionKey, value),
    [toggleFilter, pageId]
  );

  const handleSingleSelect = useCallback(
    (sectionKey: string, value: string) => setFilter(pageId, sectionKey, [value]),
    [setFilter, pageId]
  );

  const renderSectionContent = (section: FilterSectionConfig) => {
    const selectedValues = filters[section.key] ?? [];

    if (section.variant === 'searchable') {
      return (
        <FilterSearchSelect
          options={section.options}
          selectedValues={selectedValues}
          onToggle={(v) => handleToggleOption(section.key, v)}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {section.options.map((opt) => {
          const label = intl.formatMessage({
            id: opt.labelKey,
            defaultMessage: opt.labelDefault,
          });

          if (section.type === 'single') {
            return (
              <FilterRadio
                key={opt.value}
                label={label}
                selected={selectedValues.includes(opt.value)}
                onChange={() => handleSingleSelect(section.key, opt.value)}
                icon={opt.icon}
              />
            );
          }

          return (
            <FilterCheckbox
              key={opt.value}
              label={label}
              checked={selectedValues.includes(opt.value)}
              onChange={() => handleToggleOption(section.key, opt.value)}
              icon={opt.icon}
            />
          );
        })}
      </div>
    );
  };

  const sectionElements = sections.map((section) => {
    const selectedValues = filters[section.key] ?? [];
    return (
      <FilterSection
        key={section.key}
        title={intl.formatMessage({
          id: section.titleKey,
          defaultMessage: section.titleDefault,
        })}
        selectedCount={selectedValues.length}
      >
        {renderSectionContent(section)}
      </FilterSection>
    );
  });

  return (
    <div>
      {/* Toggle button */}
      <FilterButton
        activeCount={activeCount}
        isOpen={isOpen}
        onToggle={handleToggle}
      />

      {/* Desktop: inline expandable panel */}
      {!isMobile && (
        <div
          style={{
            maxHeight: isOpen ? (panelHeight + 48) : 0,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          <div
            ref={panelRef}
            style={{
              marginTop: '12px',
              padding: '8px 20px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg, var(--radius-sm))',
              background: 'var(--color-bg-surface-1)',
            }}
          >
            {/* Clear all header */}
            {activeCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingBottom: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--color-accent-growth)',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  {intl.formatMessage({
                    id: 'filters.clear_all',
                    defaultMessage: 'Clear All',
                  })}
                </button>
              </div>
            )}

            {sectionElements}
          </div>
        </div>
      )}

      {/* Mobile: drawer overlay */}
      {isMobile && (
        <MobileFilterDrawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onClearAll={handleClearAll}
          activeCount={activeCount}
        >
          {sectionElements}
        </MobileFilterDrawer>
      )}
    </div>
  );
}

/**
 * Wrap in Suspense because useSearchParams (inside useFilterURL)
 * requires a Suspense boundary in Next.js App Router.
 */
export function FilterPanel(props: FilterPanelProps) {
  return (
    <Suspense fallback={null}>
      <FilterPanelInner {...props} />
    </Suspense>
  );
}
