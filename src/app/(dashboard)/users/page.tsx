import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components';
import { UsersTable } from './components/UsersTable';

const usersData = [
  { id: '1', name: 'Super Admin', email: 'admin@gmail.com', role: 'Super Admin', joined: 'Oct 2026', status: 'Active' },
  { id: '2', name: 'Chormokar Admin', email: 'chormokar@outlook.com', role: 'Super Admin', joined: 'Oct 2026', status: 'Active' },
  { id: '3', name: 'Ayon', email: 'ayon@gmail.com', role: 'Super Admin', joined: 'Oct 2026', status: 'Active' },
];

export default function UsersPage() {
  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="User Management"
        description="Manage customer accounts and staff permissions."
        actions={
          <button type="button" className="btn btn-primary px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
            <Plus size={18} />
            <span>Invite User</span>
          </button>
        }
      />

      <UsersTable users={usersData} />
    </div>
  );
}
