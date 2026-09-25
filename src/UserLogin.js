import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { browserLocalPersistence, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase_config';

function UserLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const login = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-full min-h-screen">
      <form onSubmit={login} className="bg-white shadow-md text-center h-fit w-96 p-8 rounded-xl">
        <h2 className="text-2xl font-extrabold text-gray-500 pb-4">Log in to your account</h2>
        <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="email">Email address</label>
        <input id="email" className="block w-full mb-3 p-3 ring-2 ring-blue-200 rounded-xl" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="password">Password</label>
        <input id="password" className="block w-full p-3 ring-2 ring-blue-200 rounded-xl" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="flex items-center mt-3 text-left text-sm text-gray-600">
          <input type="checkbox" className="mr-2" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          Remember me
        </label>
        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
        <button className="btn w-full mt-3" type="submit">Log In</button>
        <hr className="mt-6 mb-5" />
        <p>
          Dont have an account?{' '}
          <Link className="text-primary hover:underline" to="/signup">Sign up</Link>
        </p>
        <p className="mt-2">
          <Link className="text-primary hover:underline" to="/forgot-password">Forgot password?</Link>
        </p>
      </form>
    </div>
  );
}

export default UserLogin;
