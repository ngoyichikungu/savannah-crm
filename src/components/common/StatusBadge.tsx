import React from 'react';
import { InvoiceStatus, QuotationStatus } from '../../types';

interface StatusBadgeProps {
  status: InvoiceStatus | QuotationStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';
  let label = status.replace('_', ' ');

  switch (status) {
    case 'draft':
      colorClasses = 'bg-stone-100 text-stone-700 border-stone-300';
      break;
    case 'sent':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'viewed':
    case 'under_review':
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'partially_paid':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-300';
      break;
    case 'paid':
    case 'accepted':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
      break;
    case 'overdue':
      colorClasses = 'bg-red-50 text-red-700 border-red-300 font-bold';
      break;
    case 'cancelled':
    case 'rejected':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'credited':
    case 'superseded':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'expired':
      colorClasses = 'bg-stone-200 text-stone-600 border-stone-300';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium border ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
