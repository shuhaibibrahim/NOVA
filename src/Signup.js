import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from './firebase_config';

const DEPARTMENTS = [
  'Clicker', 'Printing and Embossing', 'Stitching', 'FIU Store', 'RM Store',
  'SFG Store', 'Grinding', 'Sole Store', 'Attaching', 'Packing', 'Despatch',
  'Shift Engineer', 'MM-Office', 'MM-Admin', 'PP-Office', 'HR Admin',
  'HR-Office', 'Finance-Admin', 'Finance-Office',
];

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', department: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const request = {
        uid: credential.user.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department,
        phone: form.phone.trim(),
        status: 'pending',
        requestedAt: Date.now(),
      };
      await set(ref(db, `userRequests/${credential.user.uid}`), request);
      await set(ref(db, `users/${credential.user.uid}`), {
        name: request.name,
        email: request.email,
        department: request.department,
        phone: request.phone,
        admin: false,
        status: 'pending',
      });
      await signOut(auth);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (submitted) {
    return (
      <div className="flex justify-center items-center h-full min-h-screen">
        <div className="bg-white shadow-md text-center w-96 p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-gray-700">Request submitted</h2>
          <p className="mt-3 text-gray-600">An administrator must approve your account before you can log in.</p>
          <Link className="btn inline-block mt-5" to="/">Return to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-full min-h-screen">
      <form onSubmit={submit} className="bg-white shadow-md w-full max-w-md p-8 rounded-xl">
        <h2 className="text-2xl font-extrabold text-gray-500 pb-4 text-center">Sign up</h2>
        {[
          ['name', 'Name', 'text'],
          ['email', 'Email Id', 'email'],
          ['password', 'Password', 'password'],
          ['phone', 'Phone number', 'tel'],
        ].map(([name, label, type]) => (
          <React.Fragment key={name}>
            <label className="text-left block text-sm text-gray-600 mb-1" htmlFor={name}>{label}</label>
            <input id={name} name={name} type={type} required className="block w-full mb-3 p-3 ring-2 ring-blue-200 rounded-xl" value={form[name]} onChange={updateField} />
          </React.Fragment>
        ))}
        <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="department">Department</label>
        <select id="department" name="department" required className="block w-full mb-3 p-3 ring-2 ring-blue-200 rounded-xl" value={form.department} onChange={updateField}>
          <option value="">Select department</option>
          {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
        </select>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <button className="btn w-full" type="submit">Submit request</button>
        <p className="text-center mt-5">Already have an account? <Link className="text-primary hover:underline" to="/">Log in</Link></p>
      </form>
    </div>
  );
}

export default Signup;
