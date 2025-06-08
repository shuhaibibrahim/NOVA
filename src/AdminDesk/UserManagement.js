import React, { useState, useEffect } from 'react';
import { db } from '../firebase_config'; // Assuming firebase_config.js contains your Firebase initialization
 
const UserManagement = () => {
  const [userRequests, setUserRequests] = useState([]);

  useEffect(() => {
    const userRequestsRef = db.ref('userRequests');
    userRequestsRef.on('value', (snapshot) => {
      const requestsData = snapshot.val();
      if (requestsData) {
        const requestsList = Object.keys(requestsData).map((key) => ({
          id: key,
          ...requestsData[key],
        }));
        setUserRequests(requestsList);
      } else {
        setUserRequests([]);
      }
    });

    return () => {
      userRequestsRef.off();
    };
  }, []);

  const handleApprove = async (request) => {
    try {
      const userRef = db.ref(`users/${request.id}`);
      await userRef.set({
        email: request.email,
        role: request.role,
        // Add any other relevant user details here
      });

      const requestRef = db.ref(`userRequests/${request.id}`);
      await requestRef.remove();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (request) => {
    try {
      const requestRef = db.ref(`userRequests/${request.id}`);
      await requestRef.remove();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  return (
    <div className="user-management-container">
      <h2>User Requests</h2>
      {userRequests.length === 0 ? (
        <p>No user requests found.</p>
      ) : (
        <ul className="request-list">
          {userRequests.map((request) => (
            <li key={request.id} className="request-item">
              <div className="user-details">
                <p><strong>Email:</strong> {request.email}</p>
                <p><strong>Role:</strong> {request.role}</p>
                {/* Display other user details as needed */}
              </div>
              <div className="action-buttons">
                <button onClick={() => handleApprove(request)} className="approve-button">Approve</button>
                <button onClick={() => handleReject(request)} className="reject-button">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .user-management-container {
          padding: 20px;
          font-family: sans-serif;
        }

        h2 {
          color: #333;
          margin-bottom: 20px;
        }

        .request-list {
          list-style: none;
          padding: 0;
        }

        .request-item {
          border: 1px solid #ddd;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-details p {
          margin: 5px 0;
        }

        .action-buttons button {
          padding: 8px 15px;
          margin-left: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .approve-button {
          background-color: #28a745;
          color: white;
        }

        .approve-button:hover {
          background-color: #218838;
        }

        .reject-button {
          background-color: #dc3545;
          color: white;
        }

        .reject-button:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;