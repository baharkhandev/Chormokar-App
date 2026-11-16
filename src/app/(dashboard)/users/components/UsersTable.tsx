import { StatusBadge } from '../../../../components/StatusBadge';
import { EmptyState } from '../../../../components/EmptyState';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  status: string;
}

export interface UsersTableProps {
  users: UserItem[];
}

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return <EmptyState title="No users found" message="Invite your first staff or customer." />;
  }

  return (
    <div className="w-full overflow-x-auto admin-card">
      <table className="w-full border-collapse text-left">
        <thead className="bg-bg-secondary/40">
          <tr>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Name
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Email
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Role
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Joined
            </th>
            <th className="px-6 py-3.5 text-[10px] uppercase tracking-[0.08em] text-text-muted border-b border-border-color font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/70">
          {users.map((user) => (
            <tr key={user.id} className="transition-colors duration-200 hover:bg-bg-secondary/40">
              <td className="px-6 py-5 text-[0.95rem] text-text-primary font-semibold">
                {user.name}
              </td>
              <td className="px-6 py-5 text-[0.95rem] text-text-secondary">
                {user.email}
              </td>
              <td className="px-6 py-5 text-[0.95rem] text-text-secondary font-medium">
                {user.role}
              </td>
              <td className="px-6 py-5 text-[0.95rem] text-text-secondary">
                {user.joined}
              </td>
              <td className="px-6 py-5 text-[0.95rem]">
                <StatusBadge status={user.status} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
