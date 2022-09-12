import './App.css';
import SpareIn from './SpareIn';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
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
              });
          } else {
              setUser(null);
          }
      });
  }, []);

  return (
    <div className="App bg-blue-100">
      <Router>
      <Switch>
        <Route path="/" exact>
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

        {/* admin */}
        {/* <Route path="/admin" exact>
          <AdminMain setUser={setUser} user={user}/>
        </Route> */}
        <Route path="/admin" exact>
          {user&&isAdmin?<AdminHome setUser={setUser} user={user}/>:<Redirect to="/" />}
        </Route>

        <Route path="/adminAdd" exact>
          {user&&isAdmin?<AdminAdd/>:<Redirect to="/"/>}
        </Route>

        <Route path="/adminDelete" exact>
          {user&&isAdmin?<AdminDelete/>:<Redirect to="/"/>}
        </Route>

        <Route path="/adminEdit" exact>
          {user&&isAdmin?<AdminEdit/>:<Redirect to="/"/>}
        </Route>
      </Switch>
      </Router>
    </div>
  );
}

export default App;
