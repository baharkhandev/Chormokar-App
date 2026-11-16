'use client';

import Link from 'next/link';
import { Eye, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '../../../../components/StatusBadge';
import { EmptyState } from '../../../../components/EmptyState';

export interface OrderItem {
  id: string;
  customer: string;
  email: string;
  date: string;
  total: number;
  status: string;
  payment: string;
  items: number;
}

export interface OrdersTableProps {
  orders: OrderItem[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return <EmptyState title="No orders found" message="Try searching for a different order ID or customer." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-color bg-bg-secondary/40">
            <th className="p-4 pl-6 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Order ID
            </th>
            <th className="p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Customer
            </th>
            <th className="p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Date
            </th>
            <th className="p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Payment
            </th>
            <th className="p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Status
            </th>
            <th className="p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted text-right">
              Total
            </th>
            <th className="p-4 pr-6 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/70">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-bg-secondary/40 transition-colors group cursor-pointer"
            >
              <td className="p-4 pl-6 font-bold text-text-primary whitespace-nowrap">
                <Link
                  href={`/orders`}
                  className="hover:text-accent-primary hover:underline transition-colors"
                >
                  {order.id}
                </Link>
              </td>
              <td className="p-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-text-primary text-sm">{order.customer}</span>
                  <span className="text-xs text-text-muted">{order.email}</span>
                </div>
              </td>
              <td className="p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                {order.date}
              </td>
              <td className="p-4">
                <StatusBadge status={order.payment} size="sm" variant="subtle" dot={false} />
              </td>
              <td className="p-4">
                <StatusBadge status={order.status} size="sm" />
              </td>
              <td className="p-4 text-right font-bold text-text-primary whitespace-nowrap text-sm">
                ৳{order.total.toFixed(2)}
              </td>
              <td className="p-4 pr-6 text-right">
                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/orders`}
                    className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                    title="View Order"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    type="button"
                    className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors cursor-pointer"
                    title="More Options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
