import Link from 'next/link';
import { StatusBadge } from '../../../components/StatusBadge';

export interface RecentOrder {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
}

export interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="bg-bg-secondary/40">
          <tr>
            <th className="px-6 py-4 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Order ID
            </th>
            <th className="px-6 py-4 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Customer
            </th>
            <th className="px-6 py-4 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Date
            </th>
            <th className="px-6 py-4 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Amount
            </th>
            <th className="px-6 py-4 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/70">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                No recent orders found.
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="transition-colors duration-200 hover:bg-bg-secondary/40">
                <td className="px-6 py-5 text-[0.95rem] text-text-primary font-semibold">
                  <Link
                    href={`/orders`}
                    className="hover:text-accent-primary transition-colors hover:underline"
                  >
                    {order.id}
                  </Link>
                </td>
                <td className="px-6 py-5 text-[0.95rem] text-text-secondary">{order.customer}</td>
                <td className="px-6 py-5 text-[0.95rem] text-text-secondary">{order.date}</td>
                <td className="px-6 py-5 text-[0.95rem] text-text-secondary font-medium">
                  {order.amount}
                </td>
                <td className="px-6 py-5 text-[0.95rem]">
                  <StatusBadge status={order.status} size="sm" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
