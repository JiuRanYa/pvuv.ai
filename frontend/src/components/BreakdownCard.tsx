import React, { useState } from 'react';
import { ChevronDown, Scan } from 'lucide-react';
import type { BreakdownRow } from '../lib/types';
import { fmtCompact, fmtNumber } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Dropdown } from './Dropdown';
import { Modal } from './Modal';

export type BarTone = 'blue' | 'orange' | 'indigo' | 'emerald' | 'red';

const BAR_CLASSES: Record<BarTone, string> = {
  blue: 'bg-blue-50 group-hover:bg-blue-100/80',
  orange: 'bg-orange-50 group-hover:bg-orange-100/80',
  indigo: 'bg-indigo-50 group-hover:bg-indigo-100/80',
  emerald: 'bg-emerald-50 group-hover:bg-emerald-100/80',
  red: 'bg-red-50 group-hover:bg-red-100/80',
};

export interface CardTab {
  id: string;
  label: string;
  subOptions?: Array<{ id: string; label: string }>;
}

export function BreakdownCard({
  tabs,
  activeTab,
  onTabChange,
  tone,
  leftColLabel,
  rightColLabel,
  rows,
  getRowKey,
  getRowLabel,
  getRowValue,
  renderIcon,
  onRowClick,
  customBody,
  onOpenDetails,
  detailRows,
  detailLoading,
  loading,
}: {
  tabs: CardTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tone: BarTone;
  leftColLabel: string;
  rightColLabel: string;
  rows: BreakdownRow[];
  getRowKey: (row: BreakdownRow) => string;
  getRowLabel: (row: BreakdownRow) => string;
  getRowValue: (row: BreakdownRow) => number;
  renderIcon?: (row: BreakdownRow) => React.ReactNode;
  onRowClick?: (row: BreakdownRow) => void;
  customBody?: React.ReactNode;
  onOpenDetails?: () => void;
  detailRows?: BreakdownRow[];
  detailLoading?: boolean;
  loading?: boolean;
}) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);

  const visible = rows.slice(0, 9);
  const maxVal = visible.reduce((m, r) => Math.max(m, getRowValue(r)), 0);

  const openModal = () => {
    setModalOpen(true);
    onOpenDetails?.();
  };

  const renderList = (list: BreakdownRow[], maxV: number) => {
    if (!list.length) {
      return (
        <div className="flex-1 flex items-center justify-center py-16 text-[13px] text-zinc-400">
          {t('empty.no_data')}
        </div>
      );
    }
    return (
      <div className="mt-0.5 space-y-1">
        {list.map((row, idx) => {
          const val = getRowValue(row);
          const pct = maxV > 0 ? Math.max((val / maxV) * 100, 1.5) : 0;
          const key = getRowKey(row) || `row-${idx}`;
          const label = getRowLabel(row);
          return (
            <div
              key={`${key}-${idx}`}
              onClick={() => onRowClick?.(row)}
              title={`${label}: ${fmtNumber(val)}`}
              className={`relative h-8 flex items-center justify-between px-2 rounded-sm group transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-zinc-100/50' : ''
              }`}
            >
              <div
                style={{ width: `${pct}%` }}
                className={`absolute inset-y-0 left-0 rounded-sm transition-all duration-300 ${BAR_CLASSES[tone]}`}
              />
              <div className="relative z-10 flex items-center gap-2 min-w-0 pr-3">
                {renderIcon?.(row)}
                <span className="text-[13.5px] text-zinc-800 truncate">{label}</span>
              </div>
              <span className="relative z-10 text-[13.5px] font-medium text-zinc-800 tabular-nums shrink-0">
                {fmtCompact(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const modalList = detailRows ?? rows;
  const modalMax = modalList.reduce((m, r) => Math.max(m, getRowValue(r)), 0);

  return (
    <>
      <div className="plausible-card p-5 min-h-[430px] flex flex-col">
        {/* Card Header Bar (Plausible 34px hairline + uppercase active underline) */}
        <div className="h-[34px] flex items-center justify-between border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isSubActive = tab.subOptions?.some((s) => s.id === activeTab);
              const isActive = tab.id === activeTab || Boolean(isSubActive);
              const activeSub = tab.subOptions?.find((s) => s.id === activeTab);

              if (tab.subOptions && tab.subOptions.length > 0) {
                return (
                  <Dropdown
                    key={tab.id}
                    align="left"
                    widthClass="min-w-[160px]"
                    value={activeTab}
                    onSelect={onTabChange}
                    options={tab.subOptions.map((s) => ({ value: s.id, label: s.label }))}
                    trigger={() => (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 pb-[13px] -mb-px text-[12px] font-semibold uppercase tracking-[0.03em] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'text-zinc-900 border-zinc-900'
                            : 'text-zinc-500 border-transparent hover:text-zinc-800'
                        }`}
                      >
                        <span>{activeSub ? activeSub.label : tab.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  />
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`pb-[13px] -mb-px text-[12px] font-semibold uppercase tracking-[0.03em] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-zinc-900 border-zinc-900'
                      : 'text-zinc-500 border-transparent hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={openModal}
            title={t('toolbar.details')}
            className="p-1 -mr-1 -mt-2 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer shrink-0"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Content */}
        {customBody ? (
          customBody
        ) : (
          <div className={`flex-1 flex flex-col transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between pt-3 pb-1.5 text-[12px] font-medium text-zinc-500">
              <span>{leftColLabel}</span>
              <span>{rightColLabel}</span>
            </div>
            {renderList(visible, maxVal)}
          </div>
        )}
      </div>

      {/* Expand Top-100 Details Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={leftColLabel}
        maxWidth="max-w-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 text-[12px] font-medium text-zinc-500">
          <span>{leftColLabel}</span>
          <span>{rightColLabel}</span>
        </div>
        {detailLoading ? (
          <div className="py-12 text-center text-[13px] text-zinc-400">Loading…</div>
        ) : (
          <div className="mt-2">{renderList(modalList, modalMax)}</div>
        )}
      </Modal>
    </>
  );
}
