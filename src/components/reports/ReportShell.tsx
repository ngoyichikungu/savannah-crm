import React, { useState, useMemo } from 'react';
import { Company, ReportColumn, ReportContract, ReportDateRange, ReportPreset, ReportRequest } from '../../types';
import { ReportingDateUtils } from '../../services/reportingDateUtils';
import { DocumentPdfService } from '../../services/documentPdfService';
import {
  Calendar,
  Download,
  Printer,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  RefreshCw,
} from 'lucide-react';

interface ReportShellProps<TFilters = any, TRow = any, TTotals = any> {
  report: ReportContract<TFilters, TRow, TTotals>;
  company: Company;
  initialPreset?: ReportPreset;
  onRefresh?: () => void;
  renderCustomTotals?: (totals: TTotals, rows: TRow[]) => React.ReactNode;
}

export function ReportShell<TFilters = any, TRow = any, TTotals = any>({
  report,
  company,
  initialPreset = 'this_quarter',
  onRefresh,
  renderCustomTotals,
}: ReportShellProps<TFilters, TRow, TTotals>) {
  // Date range state with presets
  const [dateRange, setDateRange] = useState<ReportDateRange>(() =>
    ReportingDateUtils.getPresetRange(initialPreset)
  );

  // Dynamic filter state from report parameters
  const defaultParameters = useMemo(() => report.parameters(company), [report, company]);
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const p of defaultParameters) {
      if (p.defaultValue !== undefined) {
        initial[p.id] = p.defaultValue;
      }
    }
    return initial;
  });

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lookbackDays, setLookbackDays] = useState<number>(90);

  // Handle slider days change
  const handleSliderChange = (days: number) => {
    setLookbackDays(days);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      preset: 'custom',
    });
  };

  // Handle preset change
  const handlePresetSelect = (preset: ReportPreset) => {
    if (preset === 'custom') {
      setDateRange((prev) => ({ ...prev, preset: 'custom' }));
    } else {
      const newRange = ReportingDateUtils.getPresetRange(preset);
      setDateRange(newRange);
    }
  };

  // Build report request
  const request: ReportRequest<TFilters> = useMemo(
    () => ({
      companyId: company.id,
      dateRange,
      filters: filters as TFilters,
    }),
    [company.id, dateRange, filters]
  );

  // Fetch raw rows and compute totals
  const rawRows = useMemo(() => {
    return report.rows(company.id, request);
  }, [report, company.id, request]);

  const totals = useMemo(() => {
    return report.totals(rawRows, filters as TFilters, company, request);
  }, [report, rawRows, filters, company, request]);

  const columns = useMemo(() => {
    return report.columns(filters as TFilters, company);
  }, [report, filters, company]);

  // Filter rows by quick search
  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return rawRows;
    const q = searchQuery.toLowerCase().trim();
    return rawRows.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rawRows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return searchedRows;
    const sorted = [...searchedRows];
    sorted.sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return sorted;
  }, [searchedRows, sortKey, sortOrder]);

  // Sort toggle handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvData = report.exportCsv(company, sortedRows, totals, filters as TFilters, request);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${report.id}_${dateRange.startDate}_to_${dateRange.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export PDF / Print View
  const handleExportPdf = () => {
    const html = report.exportPdfHtml(company, sortedRows, totals, filters as TFilters, request);
    DocumentPdfService.printReportHtml(html, `${report.name} - ${company.name}`);
  };

  const presetButtons: { label: string; preset: ReportPreset }[] = [
    { label: 'Today', preset: 'today' },
    { label: 'This Week', preset: 'this_week' },
    { label: 'This Month', preset: 'this_month' },
    { label: 'Last Month', preset: 'last_month' },
    { label: 'This Quarter', preset: 'this_quarter' },
    { label: 'This Year', preset: 'this_year' },
    { label: 'Custom Range', preset: 'custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                Audited Report
              </span>
              <span className="text-xs text-stone-500 font-medium">
                Tenant Scoped: <strong className="text-stone-800">{company.name}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-1">{report.name}</h1>
            <p className="text-xs text-stone-600 max-w-2xl mt-1 leading-relaxed">{report.description}</p>
          </div>

          {/* Action Buttons: CSV & PDF Export */}
          <div className="flex items-center gap-2 flex-wrap">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-xl hover:bg-stone-50 transition"
                title="Refresh Dataset"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 hover:border-stone-400 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Document</span>
            </button>
          </div>
        </div>

        {/* Global Parameter Bar */}
        <div className="mt-5 space-y-4">
          {/* Preset Buttons & Date Semantic Notice */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-stone-700 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                Period Preset:
              </span>
              {presetButtons.map((btn) => (
                <button
                  key={btn.preset}
                  onClick={() => handlePresetSelect(btn.preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                    dateRange.preset === btn.preset
                      ? 'bg-emerald-800 text-white shadow-xs font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
              <Info className="w-3 h-3 text-stone-400 flex-shrink-0" />
              <span>Dates are evaluated inclusive of both start and end dates.</span>
            </div>
          </div>

          {/* Date Picker Inputs & Dynamic Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
            {/* Start Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1">
                Start Date (Inclusive)
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                    preset: 'custom',
                  }))
                }
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1">
                End Date (Inclusive)
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                    preset: 'custom',
                  }))
                }
                className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Lookback Range Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                  Lookback Range
                </label>
                <span className="text-[11px] font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {lookbackDays} Days
                </span>
              </div>
              <input
                type="range"
                min={7}
                max={365}
                step={7}
                value={lookbackDays}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-700 focus:outline-none"
              />
              <div className="flex justify-between text-[9px] text-stone-400 font-mono mt-0.5">
                <span>7d</span>
                <span>90d</span>
                <span>180d</span>
                <span>365d</span>
              </div>
            </div>

            {/* Custom Report Parameters */}
            {defaultParameters.map((param) => (
              <div key={param.id}>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1">
                  {param.label}
                </label>
                {param.type === 'select' && param.options ? (
                  <select
                    value={filters[param.id] ?? 'all'}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, [param.id]: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {param.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filters[param.id] ?? ''}
                    placeholder={param.placeholder || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, [param.id]: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Optional Custom Metric Summary Cards */}
      {renderCustomTotals && renderCustomTotals(totals, sortedRows)}

      {/* Results Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Table Search & Record Count Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search within rows..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="text-xs text-stone-500 font-medium">
            Showing <strong className="text-stone-900">{sortedRows.length}</strong> record{sortedRows.length === 1 ? '' : 's'} (of {rawRows.length} raw matches)
          </div>
        </div>

        {/* Scrollable Sticky Header Table */}
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-stone-100 z-10 shadow-xs">
              <tr className="border-b border-stone-300 text-[11px] uppercase tracking-wider text-stone-700 font-bold">
                <th className="py-3 px-3 w-10 text-center text-stone-400 font-mono">#</th>
                {columns.map((col: ReportColumn<TRow>) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`py-3 px-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                      col.sortable !== false ? 'cursor-pointer select-none hover:bg-stone-200/80 transition' : ''
                    }`}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      <span>{col.label}</span>
                      {col.sortable !== false && (
                        sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs">
              {sortedRows.length > 0 ? (
                sortedRows.map((row: any, idx) => (
                  <tr key={row.id || `row_${idx}`} className="hover:bg-stone-50/80 transition group">
                    <td className="py-3 px-3 text-center text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                    {columns.map((col: ReportColumn<TRow>) => {
                      const val = row[col.key];
                      const formatted = col.format ? col.format(val, row) : val;

                      return (
                        <td
                          key={col.key}
                          className={`py-3 px-3 ${col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                            col.key === 'status' ? 'font-medium' : 'text-stone-800'
                          }`}
                        >
                          {col.key === 'status' ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                String(val).toLowerCase().includes('won') || String(val).toLowerCase().includes('paid') || String(val).toLowerCase().includes('completed')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : String(val).toLowerCase().includes('lost') || String(val).toLowerCase().includes('overdue') || String(val).toLowerCase().includes('cancelled')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {String(val).replace(/_/g, ' ')}
                            </span>
                          ) : (
                            formatted
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="py-12 text-center text-stone-400 text-xs bg-stone-50/50 font-medium"
                  >
                    No matching records found for the applied dates and parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
