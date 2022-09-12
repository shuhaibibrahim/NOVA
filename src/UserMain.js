import React, { useEffect, useState } from 'react'
import { auth } from "./firebase_config";
import {BrowserRouter,Routes,Route} from "react-router-dom"
import UserLogin from './UserLogin';
import HomePage from './HomePage';

function UserMain({user, setUser}) {

    return (
        // <div className="h-full min-h-screen flex items-center justify-center">
        <>
            {!user?<UserLogin/>:<HomePage setUser={setUser}/>}
        </>
        // </div>
    )
}

export default UserMain;
