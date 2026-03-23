interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div
      className={`
        inline-flex
        p-1
        bg-brand-bg
        rounded-[var(--radius-pill)]
        ${className}
      `}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              px-4 py-2
              text-sm font-medium
              rounded-[var(--radius-pill)]
              transition-colors duration-150
              ${
                isActive
                  ? 'bg-brand-emerald text-[#FFFFFF] shadow-[var(--shadow-soft)]'
                  : 'text-brand-navy/60 hover:text-brand-navy'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

