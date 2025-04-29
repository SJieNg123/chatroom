import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../config/firebase';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface UserData {
  username: string;
  email: string;
  phoneNumber: string;
  address: string;
  photoURL: string;
}

const UserProfile: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    email: '',
    phoneNumber: '',
    address: '',
    photoURL: '',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get userId from query parameters
  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        navigate('/signin');
        return;
      }

      try {
        // If userId is provided and different from current user, fetch that user's data
        const targetUserId = userId || auth.currentUser.uid;
        setIsCurrentUser(targetUserId === auth.currentUser.uid);
        
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !isCurrentUser) return;

    setUpdating(true);
    try {
      let photoURL = userData.photoURL;

      if (selectedFile) {
        const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, selectedFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...userData,
        photoURL,
      });

      setUserData((prev) => ({
        ...prev,
        photoURL,
      }));
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleBack = () => {
    navigate('/chat');
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" gutterBottom align="center" sx={{ flex: 1 }}>
            {isCurrentUser ? 'Your Profile' : 'User Profile'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Avatar
            src={userData.photoURL}
            sx={{ width: 100, height: 100 }}
          />
        </Box>
        {isCurrentUser ? (
          <form onSubmit={handleSubmit}>
            <input
              accept="image/*"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="profile-picture-input"
            />
            <label htmlFor="profile-picture-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                sx={{ mb: 3 }}
              >
                Change Profile Picture
              </Button>
            </label>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={userData.username}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              margin="normal"
              type="email"
            />
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={userData.phoneNumber}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={userData.address}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={updating}
            >
              {updating ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </form>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              {userData.username || 'Username not set'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Email:</strong> {userData.email || 'Not provided'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Phone:</strong> {userData.phoneNumber || 'Not provided'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Address:</strong> {userData.address || 'Not provided'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default UserProfile; 