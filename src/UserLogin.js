import React, { useState } from "react";
import { auth } from "./firebase_config";
import { ref, set } from "firebase/database";
import { db } from "./firebase_config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

function UserLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [hasAccount, setHasAccount] = useState(true)
    const [selectedProcesses, setSelectedProcesses] = useState([]);
    const [view, setView] = useState(false)
    const login = () => {
        signInWithEmailAndPassword(auth, email, password).catch((err) => {
            setError(err.message);
        });
    };

    const signup = () => {
        createUserWithEmailAndPassword(auth, email, password)
        .then((userCred)=>{
            const userData = {
                admin:false,
                email: userCred.user.email,
                role: selectedRole
            };
            if (selectedRole === 'Production Section Charge') {
                userData.preallocatedProcesses = selectedProcesses;
            }
            const userRef = ref(db, `users/${userCred.user.uid}`);
            set(userRef, userData);
        })
        .catch((err) => {
            setError(err.message);
        });
    };

    return (
        <div className="flex justify-center items-center h-full min-h-screen">
            {/* {onBoarding ? (
                <div className="flex-75 flex justify-center items-center">
                    <div className="text-center h-fit">
                        <h2 className="text-3xl font-light text-gray-500 mb-2">College of Engineering Trivandrum is inviting</h2>
                        <h1 className="text-3xl font-semibold text-tertiary mb-8">Application for the post of Director, CET School of Management</h1>
                        
                        <button className="btn-lg" onClick={() => setOnBoarding(!onBoarding)}>
                            Apply Now
                        </button>
                    </div>
                </div>
            ) : ( */}
                <div className="bg-white shadow-md text-center h-fit w-96 p-8 rounded-xl">
                    {hasAccount ? (
                        <h2 className="text-2xl font-extrabold text-gray-500 pb-4">Log in to your account</h2>
                    ) : (
                        <h2 className="text-2xl font-extrabold text-gray-500 pb-4">Sign up to apply</h2>
                    )}
                    <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="email">
                        Email address
                    </label>
                    <input
                        className="form-control block w-full mb-3 p-3 ring-2 ring-blue-200 focus:outline-none focus:ring-blue-400 rounded-xl"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                        }}
                    />

                    <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="password">
                        Password
                    </label>
                    <div className="w-full relative flex flex-row items-center">
                        <input
                            className="form-control block w-full p-3 ring-2 ring-blue-200 focus:outline-none focus:ring-blue-400 rounded-xl"
                            type={view?"tet":"password"}
                            required
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                            }}
                        />
                        <div className="absolute right-3" onClick={()=>{setView(!view)}}>
                            {view?
                            (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>)
                            :
                            (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>)}
                        </div>
                    </div>

                    {!hasAccount && ( // Show role selection only during signup
                        <div className="mt-3">
                            <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="role">
                                Select Role
                            </label>
                            <select
                                className="form-control block w-full p-3 ring-2 ring-blue-200 focus:outline-none focus:ring-blue-400 rounded-xl"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="">--Select Role--</option>
                                <option value="PP Head">PP Head</option>
                                <option value="MM Head">MM Head</option>
                                <option value="Store Incharge">Store Incharge</option>
                                <option value="Production Section Charge">Production Section Charge</option>
                            </select>
                        </div>
                    )}

                    {
                        !hasAccount && selectedRole === 'Production Section Charge' && (
                            <div className="mt-3">
                                <label className="text-left block text-sm text-gray-600 mb-1" htmlFor="processes">
                                    Select Processes
                                </label>
                                <div>
                                    {['Knitting', 'Clicking', 'Stitching', 'Printing', 'Stuckon'].map(
                                        (process) => (
                                            <div key={process} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={process}
                                                    value={process}
                                                    checked={selectedProcesses.includes(process)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProcesses([...selectedProcesses, process]);
                                                        } else {
                                                            setSelectedProcesses(selectedProcesses.filter((p) => p !== process));
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={process} className="ml-2">{process}</label>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )
                    }
                    {error && <div className="text-red-600">{error}</div>}
                    {hasAccount ? (
                        <div>
                            <button className="btn w-full mt-3" onClick={login}>
                                Log In
                            </button>
                            <hr className="mt-6 mb-5" />
                            <p>
                                Dont have an account?{" "}
                                <span
                                    className="cursor-pointer text-primary hover:underline hover:text-primary-dark transition"
                                    onClick={() => {
                                        setHasAccount(!hasAccount);
                                    }}
                                >
                                    Sign up
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div>
                            <button className="btn w-full mt-3" onClick={signup}>
                                Sign Up
                            </button>
                            <hr className="mt-6 mb-5" />
                            <p>
                                Already have an account?{" "}
                                <span
                                    className="cursor-pointer text-primary hover:underline hover:text-primary-dark transition"
                                    onClick={() => {
                                        setHasAccount(!hasAccount);
                                    }}
                                >
                                    Log In
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            {/* )} */}
        </div>
    );
}

export default UserLogin;
