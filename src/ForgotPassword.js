import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { get, push, ref, set } from 'firebase/database';
import { db } from './firebase_config';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const snapshot = await get(ref(db, 'users'));
      const users = snapshot.val() || {};
      const userEntry = Object.entries(users).find(
        ([, user]) => user.email && user.email.toLowerCase() === normalizedEmail
      );
      if (!userEntry) {
        setError('That email address is not registered.');
        return;
      }

      const requestRef = push(ref(db, 'passwordRequests'));
      await set(requestRef, {
        uid: userEntry[0],
        email: normalizedEmail,
        status: 'pending',
        requestedAt: Date.now(),
      });
      setMessage('Your password request was sent for administrator approval.');
      setEmail('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-96 rounded-xl bg-white p-8 text-center shadow-md">
        <h2 className="pb-4 text-2xl font-extrabold text-gray-500">Forgot password</h2>
        <p className="mb-4 text-left text-sm text-gray-600">
          An administrator will review your request. After approval, you will receive a secure link to set your new password.
        </p>
        <input className="mb-3 block w-full rounded-xl p-3 ring-2 ring-blue-200" type="email" placeholder="Email address" required value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        {message && <div className="mb-3 text-sm text-green-600">{message}</div>}
        <button className="btn w-full" type="submit">Submit request</button>
        <p className="mt-5"><Link className="text-primary hover:underline" to="/">Return to login</Link></p>
      </form>
    </div>
  );
}

export default ForgotPassword;
