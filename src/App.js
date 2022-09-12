import './App.css';
import SpareIn from './SpareIn';
// import {
//   BrowserRouter as Router,
//   Switch,
//   Route,
//   Redirect
// } from "react-router-dom";
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import SpareOut from './SpareOut';
import SpareView from './SpareView';
import AdminAdd from './AdminAdd';
import SpareHistory from './SpareHistory';
import AdminDelete from './AdminDelete';
import AdminEdit from './AdminEdit';
import UserMain from './UserMain';
import { useEffect, useState } from 'react';
import { auth } from "./firebase_config";
import AdminHome from './AdminHome';
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase_config";
import AdminAddExcel from './AdminAddExcel';
import UserLogin from './UserLogin';
import HomePage from './HomePage';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
      auth.onAuthStateChanged((user) => {
          if (user) {
              setUser(user);

              // 
              const userRef = ref(db, `users/${user.uid}`);

              onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                ;
                  
                setIsAdmin(data.admin)
                console.log(data.admin)
              });
          } else {
              setUser(null);
          }
      });
  }, []);

  return (
    <div className="App bg-slate-100">
      <BrowserRouter>
        <Routes >
            {!user&&(<Route path="/" element={<UserLogin />} />)}
            {user&&(
            <Route path="/" element={<HomePage/>}>
              <Route index element={<SpareView/>} />
              <Route path="spareview" element={<SpareView/>} />
              <Route path="sparein" element={<SpareIn/>} />
              <Route path="spareout" element={<SpareOut/>} />
              <Route path="sparehistory" element={<SpareHistory/>}/>
              
              {/* <Route path="admin" element={<AdminHome setUser={setUser} user={user}/>} > */}
              <Route path="admin">
                <Route path="adminadd" element={<AdminAddExcel/>} />
                <Route path="admindelete" element={<AdminDelete/>} />
                <Route path="adminedit" element={<AdminEdit/>} />
              </Route>
            </Route>
            )}

            {/* <Route path="/" exact>
              <UserMain setUser={setUser} user={user}/>
            </Route>

            <Route path="/sparein" exact>
              {user?<SpareIn/>:<Redirect to="/" />}
            </Route>

            <Route path="/spareout" exact>
              {user?<SpareOut/>:<Redirect to="/" />}
            </Route>

            <Route path="/spareview" exact>
              {user?<SpareView/>:<Redirect to="/" />}
            </Route>

            <Route path="/sparehistory" exact>
              {user?<SpareHistory/>:<Redirect to="/" />}
            </Route>

            <Route path="/admin" exact>
              {user&&isAdmin?<AdminHome setUser={setUser} user={user}/>:<Redirect to="/" />}
            </Route>

            <Route path="/adminAdd" exact>
              {user&&isAdmin?<AdminAddExcel/>:<Redirect to="/"/>}
            </Route>

            <Route path="/adminDelete" exact>
              {user&&isAdmin?<AdminDelete/>:<Redirect to="/"/>}
            </Route>

            <Route path="/adminEdit" exact>
              {user&&isAdmin?<AdminEdit/>:<Redirect to="/"/>}
            </Route> */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
