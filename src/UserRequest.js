import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './firebase_config';

function UserRequest({ isAdmin }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [requests, setRequests] = useState([]);
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
    return () => {
      requestsUnsubscribe();
      passwordUnsubscribe();
    };
  }, [setSelectedLink, setOpenedTab]);

  const visibleRequests = useMemo(
    () => requests.filter((request) => request.status === view),
    [requests, view]
  );
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
    await update(ref(db), {
      [`userRequests/${request.id}/status`]: 'removed',
      [`users/${request.id}/status`]: 'removed',
      [`users/${request.id}/removedAt`]: Date.now(),
    });
  };

  const approvePasswordRequest = async (request) => {
    await sendPasswordResetEmail(auth, request.email);
    await update(ref(db), {
      [`passwordRequests/${request.id}/status`]: 'approved',
      [`passwordRequests/${request.id}/approvedAt`]: Date.now(),
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
                <button type="button" className="mt-3 rounded bg-green-600 px-3 py-1 text-white" onClick={() => approvePasswordRequest(request)}>
                  Approve and send reset email
                </button>
              </div>
            ))}
            {visiblePasswordRequests.length === 0 && <p className="text-gray-500">No password requests.</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleRequests.map((request) => (
              <div key={request.id} className="rounded border border-gray-200 p-3">
                <div className="font-medium">{request.name}</div>
                <div className="text-sm text-gray-600">{request.email} · {request.department} · {request.phone}</div>
                {view === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'approved')}>Approve</button>
                    <button type="button" className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'rejected')}>Reject</button>
                  </div>
                )}
                {view === 'rejected' && (
                  <button type="button" className="mt-3 rounded bg-green-600 px-3 py-1 text-white" onClick={() => updateRequest(request, 'approved')}>Add User</button>
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
