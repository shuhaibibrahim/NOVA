import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './firebase_config';

function UserRequest({ isAdmin }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [view, setView] = useState('pending');

  useEffect(() => {
    setSelectedLink('user-settings/request');
    setOpenedTab('userSettings');
    const requestsUnsubscribe = onValue(ref(db, 'userRequests'), (snapshot) => {
      const data = snapshot.val() || {};
      setRequests(Object.entries(data).map(([id, request]) => ({ id, ...request })));
    });
    const passwordUnsubscribe = onValue(ref(db, 'passwordRequests'), (snapshot) => {
      const data = snapshot.val() || {};
      setPasswordRequests(Object.entries(data).map(([id, request]) => ({ id, ...request })));
    });
    const usersUnsubscribe = onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val() || {};
      setRegisteredUsers(Object.entries(data).map(([id, user]) => ({ id, ...user })));
    });
    return () => {
      requestsUnsubscribe();
      passwordUnsubscribe();
      usersUnsubscribe();
    };
  }, [setSelectedLink, setOpenedTab]);

  const visibleRequests = useMemo(() => {
    if (view === 'removed') {
      const requestByUserId = new Map(requests.map((request) => [request.id, request]));
      const removedFromUsers = registeredUsers
        .filter((user) => user.status === 'removed')
        .map((user) => ({ ...(requestByUserId.get(user.id) || {}), ...user, id: user.id, name: user.name || user.email }));
      const removedIds = new Set(removedFromUsers.map((user) => user.id));
      return [
        ...removedFromUsers,
        ...requests.filter((request) => request.status === 'removed' && !removedIds.has(request.id)),
      ].sort((a, b) => (b.removedAt || 0) - (a.removedAt || 0));
    }
    if (view !== 'approved') return requests.filter((request) => request.status === view);

    const requestByUserId = new Map(requests.map((request) => [request.id, request]));
    const legacyApprovedUsers = registeredUsers
      .filter((user) => !user.status || user.status === 'approved')
      .map((user) => ({
        ...user,
        id: user.id,
        name: user.name || user.email,
        department: user.department || '',
        productionPlant: user.productionPlant || '',
        phone: user.phone || '',
        status: 'approved',
      }));

    return [...requests.filter((request) => request.status === 'approved'), ...legacyApprovedUsers
      .filter((user) => !requestByUserId.has(user.id))];
  }, [requests, registeredUsers, view]);
  const visiblePasswordRequests = useMemo(
    () => passwordRequests.filter((request) => request.status === 'pending'),
    [passwordRequests]
  );

  const updateRequest = async (request, status) => {
    const updates = {
      [`userRequests/${request.id}/status`]: status,
      [`users/${request.id}/status`]: status,
    };
    if (status === 'approved') {
      updates[`users/${request.id}/role`] = request.department;
      updates[`userRequests/${request.id}/approvalEmailStatus`] = 'pending';
      updates[`emailNotifications/${request.id}`] = {
        to: request.email,
        template: 'account-approved',
        name: request.name,
        createdAt: Date.now(),
        status: 'pending',
      };
    }
    await update(ref(db), updates);
  };

  const removeApprovedUser = async (request) => {
    const removedAt = Date.now();
    await update(ref(db), {
      [`userRequests/${request.id}/status`]: 'removed',
      [`userRequests/${request.id}/removedAt`]: removedAt,
      [`userRequests/${request.id}/name`]: request.name || request.email || '',
      [`userRequests/${request.id}/email`]: request.email || '',
      [`userRequests/${request.id}/department`]: request.department || '',
      [`userRequests/${request.id}/productionPlant`]: request.productionPlant || '',
      [`userRequests/${request.id}/phone`]: request.phone || '',
      [`users/${request.id}/status`]: 'removed',
      [`users/${request.id}/removedAt`]: removedAt,
    });
  };

  const restoreUser = async (request) => {
    await update(ref(db), {
      [`userRequests/${request.id}/status`]: 'approved',
      [`userRequests/${request.id}/name`]: request.name || request.email || '',
      [`userRequests/${request.id}/email`]: request.email || '',
      [`userRequests/${request.id}/department`]: request.department || '',
      [`userRequests/${request.id}/productionPlant`]: request.productionPlant || '',
      [`userRequests/${request.id}/phone`]: request.phone || '',
      [`userRequests/${request.id}/restoredAt`]: Date.now(),
      [`users/${request.id}/status`]: 'approved',
      [`users/${request.id}/removedAt`]: null,
    });
  };

  const approvePasswordRequest = async (request) => {
    const email = String(request.email || '').trim();
    if (!email) {
      alert('This request has no email address.');
      return;
    }
    try {
      // No continue URL: Firebase's hosted reset page is used, so no authorized-domain setup is needed.
      await sendPasswordResetEmail(auth, email);
      await update(ref(db), {
        [`passwordRequests/${request.id}/status`]: 'approved',
        [`passwordRequests/${request.id}/approvedAt`]: Date.now(),
        [`passwordRequests/${request.id}/resetEmailStatus`]: 'sent',
      });
      alert(`Password reset email sent to ${email}.`);
    } catch (error) {
      alert(`Could not send reset email to ${email}: ${error.code || error.message}`);
    }
  };

  const rejectPasswordRequest = async (request) => {
    if (!window.confirm(`Reject the password request from ${request.email}?`)) return;
    await update(ref(db), {
      [`passwordRequests/${request.id}/status`]: 'rejected',
      [`passwordRequests/${request.id}/rejectedAt`]: Date.now(),
    });
  };

  if (!isAdmin) {
    return (
      <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
        <div className="rounded bg-white p-4 text-gray-600">Only administrators can review user requests.</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <h1 className="text-lg font-semibold">User Request</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['pending', 'Not Approved'],
            ['approved', 'Approved'],
            ['rejected', 'Rejected'],
            ['password', 'Password Request'],
            ['removed', 'Removed Users'],
          ].map(([status, label]) => (
            <button key={status} type="button" onClick={() => setView(status)} className={`rounded px-3 py-2 text-sm ${view === status ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {view === 'password' ? (
          <div className="mt-4 space-y-3">
            {visiblePasswordRequests.map((request) => (
              <div key={request.id} className="rounded border border-gray-200 p-3">
                <div className="font-medium">{request.email}</div>
                <div className="text-sm text-gray-600">Requested {new Date(request.requestedAt).toLocaleString()}</div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => approvePasswordRequest(request)}>
                    Approve and send reset email
                  </button>
                  <button type="button" className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => rejectPasswordRequest(request)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {visiblePasswordRequests.length === 0 && <p className="text-gray-500">No password requests.</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleRequests.map((request) => (
              <div key={request.id} className="rounded border border-gray-200 p-3">
                <div className="font-medium">{request.name}</div>
                <div className="text-sm text-gray-600">
                  {request.email} · {request.department} · {request.productionPlant || 'Plant not specified'} · {request.phone}
                </div>
                {view === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'approved')}>Approve</button>
                    <button type="button" className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'rejected')}>Reject</button>
                  </div>
                )}
                {view === 'rejected' && (
                  <button type="button" className="mt-3 rounded bg-green-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'approved')}>Add User</button>
                )}
                {view === 'removed' && (
                  <>
                    <div className="mt-1 text-xs text-gray-500">
                      Removed {request.removedAt ? new Date(request.removedAt).toLocaleString() : 'earlier (date not recorded)'}
                    </div>
                    <button type="button" className="mt-3 rounded bg-green-600 px-3 py-1 text-white" onClick={() => restoreUser(request)}>Add User Back</button>
                  </>
                )}
                {view === 'approved' && (
                  <button type="button" className="mt-3 rounded bg-red-600 px-3 py-1 text-white" onClick={() => removeApprovedUser(request)}>Remove User</button>
                )}
              </div>
            ))}
            {visibleRequests.length === 0 && <p className="text-gray-500">No {view} requests.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserRequest;
