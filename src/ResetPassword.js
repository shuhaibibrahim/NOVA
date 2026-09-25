import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from './firebase_config';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  const actionCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!actionCode) {
      setMessage('This password-reset link is missing or invalid.');
      setStatus('error');
      return;
    }

    verifyPasswordResetCode(auth, actionCode)
      .then((accountEmail) => {
        setEmail(accountEmail);
        setStatus('ready');
      })
      .catch(() => {
        setMessage('This password-reset link is expired or has already been used.');
        setStatus('error');
      });
  }, [actionCode]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      await confirmPasswordReset(auth, actionCode, password);
      setStatus('complete');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-96 rounded-xl bg-white p-8 text-center shadow-md">
        <h2 className="pb-4 text-2xl font-extrabold text-gray-500">Set new password</h2>
        {status === 'checking' && <p className="text-sm text-gray-600">Validating your reset link...</p>}
        {status === 'error' && (
          <>
            <p className="mb-4 text-sm text-red-600">{message}</p>
            <Link className="text-primary hover:underline" to="/">Return to login</Link>
          </>
        )}
        {status === 'ready' && (
          <>
            <p className="mb-4 text-left text-sm text-gray-600">Set a new password for {email}.</p>
            <input className="mb-3 block w-full rounded-xl p-3 ring-2 ring-blue-200" type="password" placeholder="New password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <input className="mb-3 block w-full rounded-xl p-3 ring-2 ring-blue-200" type="password" placeholder="Confirm new password" minLength="6" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            {message && <div className="mb-3 text-sm text-red-600">{message}</div>}
            <button className="btn w-full" type="submit">Save new password</button>
          </>
        )}
        {status === 'complete' && (
          <>
            <p className="mb-4 text-sm text-green-600">Your password was changed successfully.</p>
            <Link className="text-primary hover:underline" to="/">Return to login</Link>
          </>
        )}
      </form>
    </div>
  );
}

export default ResetPassword;
