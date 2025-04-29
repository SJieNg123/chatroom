import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ChatRoom from './components/chat/ChatRoom';
import UserProfile from './components/profile/UserProfile';
import { auth, messaging } from './config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getToken, onMessage } from 'firebase/messaging';

const VAPID_KEY = "BPjJlL2wWCTwIYnJuw4KDq6TbbCsaH1MSfA4THC8whbVbrQ8b30OZ6PLQSDleK14jtw-mWT3H_4Im7vCTKhQ6k4";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  useEffect(() => {
    // Request notification permission and setup FCM
    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          // Get FCM token
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            console.log("FCM Token:", token);
            // Here you can send this token to your server
          }
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      // You can show a custom notification UI here
      new Notification(payload.notification?.title || 'New Message', {
        body: payload.notification?.body
      });
    });

    setupNotifications();

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App; 