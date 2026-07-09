import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import AddUserForm from '../components/AddUserForm';

export default function HRDashboard() {
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [claimTotals, setClaimTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [profilesRes, expensesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('expenses').select('employee_id, amount'),
    ]);

    if (profilesRes.error) setError(profilesRes.error.message);
    if (expensesRes.error) setError(expensesRes.error.message);

    const allProfiles = profilesRes.data || [];
    setEmployees(allProfiles.filter((p) => p.role === 'employee'));
    setManagers(allProfiles.filter((p) => p.role === 'manager'));

    const totals = {};
    (expensesRes.data || []).forEach((e) => {
      totals[e.employee_id] = (totals[e.employee_id] || 0) + (e.amount || 0);
    });
    setClaimTotals(totals);

    setLoading(false);
  }

  async function handleManagerAssign(employeeId, managerId) {
    const { error } = await supabase
      .from('profiles')
      .update({ manager_id: managerId || null })
      .eq('id', employeeId);

    if (error) {
      setError(error.message);
    } else {
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, manager_id: managerId || null } : e))
      );
    }
  }

  function handleNewEmployee(newUser) {
    setEmployees((prev) => [...prev, newUser]);
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading…</p>;
  if (error) return <p className="text-rust text-sm">{error}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
          Add a new employee
        </h2>
        <AddUserForm lockRole="employee" onCreated={handleNewEmployee} />
      </div>

      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
          Employee directory
        </h2>
        <div className="space-y-2 stagger">
          {employees.map((emp) => (
            <div key={emp.id} className="receipt-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ink font-medium">{emp.full_name}</p>
                <p className="text-xs text-ink/50 font-mono mt-1">
                  Total claimed: {formatCurrency(claimTotals[emp.id] || 0)}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-ink/50 mr-2">Reports to</label>
                <select
                  value={emp.manager_id || ''}
                  onChange={(e) => handleManagerAssign(emp.id, e.target.value)}
                  className="text-sm border border-slate px-2 py-1 bg-card font-mono"
                >
                  <option value="">Unassigned</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-ink/50 text-sm">No employees yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}