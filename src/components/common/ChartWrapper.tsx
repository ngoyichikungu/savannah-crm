import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables,
  ChartType,
  ChartData,
  ChartOptions,
} from 'chart.js';

// Register all Chart.js controllers, scales, elements, and plugins globally
ChartJS.register(...registerables);

export interface ChartFallbackTable {
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
}

export interface ChartWrapperProps {
  id: string;
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  title?: string;
  subtitle?: string;
  fallbackTable?: ChartFallbackTable;
  height?: number;
  className?: string;
  onDrillDown?: () => void;
  drillDownLabel?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  id,
  type,
  data,
  options,
  title,
  subtitle,
  fallbackTable,
  height = 260,
  className = '',
  onDrillDown,
  drillDownLabel = 'View Full Report →',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart on canvas if present
    const existingChart = ChartJS.getChart(canvasRef.current) || ChartJS.getChart(`canvas-${id}`);
    if (existingChart) {
      existingChart.destroy();
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Merge default responsive and font options
    const mergedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === 'doughnut' || type === 'pie' || (data.datasets && data.datasets.length > 1),
          position: 'top',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              family: 'Plus Jakarta Sans, sans-serif',
              size: 11,
              weight: 'bold',
            },
            color: '#44403c', // stone-700
          },
        },
        tooltip: {
          backgroundColor: '#1c1917', // stone-900
          titleColor: '#f5f5f4', // stone-100
          bodyColor: '#e7e5e4', // stone-200
          borderColor: '#44403c', // stone-700
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: {
            family: 'Plus Jakarta Sans, sans-serif',
            size: 12,
            weight: 'bold',
          },
          bodyFont: {
            family: 'Plus Jakarta Sans, sans-serif',
            size: 11,
          },
        },
      },
      ...options,
    };

    // Initialize new Chart.js instance
    try {
      chartInstanceRef.current = new ChartJS(ctx, {
        type,
        data,
        options: mergedOptions,
      });
    } catch (err) {
      console.error(`Failed to initialize chart '${id}':`, err);
    }

    // Teardown callback on component unmount or livewire navigation
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (canvasRef.current) {
        const c = ChartJS.getChart(canvasRef.current);
        if (c) {
          c.destroy();
        }
      }
    };
  }, [id, type, data, options]);

  return (
    <div className={`bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between ${className}`} id={`chart-card-${id}`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && <h3 className="text-sm font-bold text-stone-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {onDrillDown && (
            <button
              onClick={onDrillDown}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors shrink-0 ml-2"
              title={drillDownLabel}
            >
              {drillDownLabel}
            </button>
          )}
        </div>

        <div style={{ height: `${height}px` }} className="relative w-full">
          <canvas ref={canvasRef} id={`canvas-${id}`} aria-label={title || 'Data chart'} role="img" />
        </div>
      </div>

      {/* Accessible Data Table Fallback inside <details> */}
      {fallbackTable && fallbackTable.headers && fallbackTable.headers.length > 0 && (
        <details className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-600 group">
          <summary className="cursor-pointer font-medium text-stone-500 hover:text-stone-800 transition-colors select-none flex items-center gap-1">
            <span className="underline decoration-dotted">View accessible data table</span>
            <span className="text-[10px] text-stone-400">({fallbackTable.rows.length} rows)</span>
          </summary>
          <div className="mt-2 overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-stone-200">
            <table className="w-full text-left border-collapse text-[11px]">
              {fallbackTable.caption && <caption className="sr-only">{fallbackTable.caption}</caption>}
              <thead>
                <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-semibold">
                  {fallbackTable.headers.map((h, i) => (
                    <th key={i} className="py-1.5 px-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fallbackTable.rows.length === 0 ? (
                  <tr>
                    <td colSpan={fallbackTable.headers.length} className="py-2 px-2.5 text-center text-stone-400">
                      No data available
                    </td>
                  </tr>
                ) : (
                  fallbackTable.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="border-b border-stone-100 hover:bg-stone-50/60">
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-2.5 font-mono text-stone-800">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
};
