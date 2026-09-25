import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, set } from 'firebase/database';
import { db } from './firebase_config';
import { CONTROL_TREE, controlKey } from './userControls';

const emptySelection = () => ({});

function UserControl() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [users, setUsers] = useState([]);
  const [targetType, setTargetType] = useState('department');
  const [target, setTarget] = useState('');
  const [selection, setSelection] = useState(emptySelection);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedLink('user-settings/control');
    setOpenedTab('userSettings');
    return onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val() || {};
      setUsers(Object.entries(data).map(([uid, user]) => ({ uid, ...user })));
    });
  }, [setSelectedLink, setOpenedTab]);

  const departments = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))].sort(),
    [users]
  );
  const selectableUsers = useMemo(
    () => users.filter((user) => !user.status || user.status === 'approved'),
    [users]
  );

  useEffect(() => {
    if (!target) {
      setSelection(emptySelection());
      return undefined;
    }

    const path = targetType === 'department'
      ? `userControls/departments/${encodeURIComponent(target)}`
      : `userControls/users/${target}`;
    return onValue(ref(db, path), (snapshot) => {
      const permissions = snapshot.val()?.permissions || {};
      setSelection(permissions);
      setMessage('');
      setMessageType('');
    });
  }, [targetType, target]);

  const togglePermission = (permissionId) => {
    const key = controlKey(permissionId);
    setSelection((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleGroup = (group) => {
    const enabled = group.children.every(([id]) => selection[controlKey(id)]);
    setSelection((current) => ({
      ...current,
      ...Object.fromEntries(group.children.map(([id]) => [controlKey(id), !enabled])),
    }));
  };

  const save = async () => {
    if (!target) return;
    if (saving) return;

    setSaving(true);
    setMessage('');
    setMessageType('');
    const path = targetType === 'department'
      ? `userControls/departments/${encodeURIComponent(target)}`
      : `userControls/users/${target}`;
    try {
      await Promise.race([
        set(ref(db, path), {
          label: targetType === 'department' ? target : users.find((user) => user.uid === target)?.email || target,
          type: targetType,
          permissions: selection,
          updatedAt: Date.now(),
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('The save is taking too long. Check your Firebase connection and try again.')), 10000);
        }),
      ]);
      setMessage('Controls saved successfully.');
      setMessageType('success');
    } catch (error) {
      setMessage(`Unable to save controls: ${error.message}`);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-lg">User Control</div>
          <button type="button" onClick={save} disabled={!target || saving} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Controls'}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <select className="rounded border p-2" value={targetType} onChange={(event) => { setTargetType(event.target.value); setTarget(''); }}>
            <option value="department">Department</option>
            <option value="user">User</option>
          </select>
          <select className="min-w-64 rounded border p-2" value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Select {targetType}</option>
            {(targetType === 'department' ? departments : selectableUsers).map((item) => (
              <option key={targetType === 'department' ? item : item.uid} value={targetType === 'department' ? item : item.uid}>
                {targetType === 'department' ? item : `${item.name || item.email} (${item.email})`}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          User-specific controls override the department controls for that user. Department controls apply to approved users in that department.
        </p>
        {message && <p className={`mt-2 text-sm ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
        <div className="mt-5 space-y-3">
          {CONTROL_TREE.map((group) => {
            const checkedCount = group.children.filter(([id]) => selection[controlKey(id)]).length;
            return (
              <div key={group.id} className="rounded border border-gray-200">
                <label className="flex items-center gap-2 bg-gray-100 p-3 font-medium">
                  <input type="checkbox" checked={checkedCount === group.children.length} onChange={() => toggleGroup(group)} />
                  {group.label} ({checkedCount}/{group.children.length})
                </label>
                <div className="grid gap-2 p-3 md:grid-cols-2">
                  {group.children.map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(selection[controlKey(id)])} onChange={() => togglePermission(id)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UserControl;
