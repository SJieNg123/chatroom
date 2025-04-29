import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField, Container, Typography, Box, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { doc, setDoc } from 'firebase/firestore';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createUserProfile = async (uid: string, userData: any) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        ...userData,
        createdAt: new Date(),
        blockedUsers: [],
      });
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(userCredential.user.uid, {
        email,
        username,
        photoURL: '',
        phoneNumber: '',
        address: '',
      });
      navigate('/chat');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfile(result.user.uid, {
        email: result.user.email,
        username: result.user.displayName || 'User',
        photoURL: result.user.photoURL || '',
        phoneNumber: result.user.phoneNumber || '',
        address: '',
      });
      navigate('/chat');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Box component="form" onSubmit={handleEmailSignUp} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign Up
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignUp}
            sx={{ mb: 2 }}
          >
            Sign Up with Google
          </Button>
          <Link to="/signin">
            {"Already have an account? Sign In"}
          </Link>
        </Box>
      </Box>
    </Container>
  );
};

export default SignUp; 