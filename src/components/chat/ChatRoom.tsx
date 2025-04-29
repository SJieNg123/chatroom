import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  where,
  getDocs,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db, storage } from '../../config/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  IconButton, 
  InputAdornment,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Popover
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import moment from 'moment';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Message {
  id: string;
  text: string;
  userId: string;
  username: string;
  createdAt: any;
  gifUrl?: string;
  groupId?: string;
}

interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface TenorGif {
  id: string;
  url: string;
  preview: string;
}

interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: any;
  members: string[];
}

const TENOR_API_KEY = 'AIzaSyAzxRd1DGEpLaErOVUhQ9QJUtH__6MBHIc';

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('Group Chat');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [gifAnchorEl, setGifAnchorEl] = useState<null | HTMLElement>(null);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // New state variables for group management
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Get groupId from query parameters
  const queryParams = new URLSearchParams(location.search);
  const groupId = queryParams.get('groupId');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Get blocked users
    const fetchBlockedUsers = async () => {
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', auth.currentUser?.uid)
      ));
      if (!userDoc.empty) {
        setBlockedUsers(userDoc.docs[0].data().blockedUsers || []);
      }
    };
    fetchBlockedUsers();

    // Fetch users
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Anonymous',
        photoURL: doc.data().photoURL
      }));
      
      // Ensure current user is in the list
      if (auth.currentUser) {
        const currentUserExists = usersData.some(user => user.uid === auth.currentUser?.uid);
        if (!currentUserExists) {
          usersData.push({
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Anonymous',
            photoURL: auth.currentUser.photoURL || undefined
          });
        }
      }
      
      setUsers(usersData);
      setLoading(false);
    };
    fetchUsers();
    
    // Fetch user's groups
    const fetchGroups = async () => {
      try {
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', auth.currentUser?.uid)
        );
        
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupsData = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Group[];
        
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    
    fetchGroups();
    
    // Fetch current group information if groupId is provided
    const fetchGroupInfo = async () => {
      if (groupId) {
        try {
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            setGroupName(groupData.name || 'Group Chat');
            setCurrentGroupId(groupId);
            
            // Fetch messages for this group
            const q = query(
              collection(db, 'messages'),
              where('groupId', '==', groupId),
              orderBy('createdAt', 'asc')
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const newMessages = snapshot.docs
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                } as Message))
                .filter((msg) => !blockedUsers.includes(msg.userId));
              
              setMessages(newMessages);
              scrollToBottom();
            });
            
            return () => unsubscribe();
          } else {
            console.error('Group not found');
            navigate('/chat');
          }
        } catch (error) {
          console.error('Error fetching group info:', error);
        }
      } else {
        // If no groupId is provided, use default group
        setGroupName('Group Chat');
        setCurrentGroupId(null);
        
        // Fetch messages for the default group
        const q = query(
          collection(db, 'messages'),
          where('groupId', '==', null),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            } as Message))
            .filter((msg) => !blockedUsers.includes(msg.userId));
          
          setMessages(newMessages);
          scrollToBottom();
        });
        
        return () => unsubscribe();
      }
    };
    
    fetchGroupInfo();
  }, [auth.currentUser, groupId, blockedUsers, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageToSend = newMessage;
    setNewMessage(''); // Clear the input immediately for better UX

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageToSend,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        createdAt: new Date(),
        groupId: currentGroupId, // Add the groupId to the message
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string, userId: string) => {
    if (auth.currentUser?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const filteredMessages = messages.filter((msg) =>
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchResultsCount = filteredMessages.length;

  const navigateToNextResult = () => {
    if (currentSearchIndex < searchResultsCount - 1) {
      setCurrentSearchIndex(currentSearchIndex + 1);
      scrollToSearchResult(currentSearchIndex + 1);
    } else {
      setCurrentSearchIndex(0);
      scrollToSearchResult(0);
    }
  };

  const navigateToPreviousResult = () => {
    if (currentSearchIndex > 0) {
      setCurrentSearchIndex(currentSearchIndex - 1);
      scrollToSearchResult(currentSearchIndex - 1);
    } else {
      setCurrentSearchIndex(searchResultsCount - 1);
      scrollToSearchResult(searchResultsCount - 1);
    }
  };

  const scrollToSearchResult = (index: number) => {
    const searchResults = document.querySelectorAll('.search-result');
    if (searchResults[index]) {
      // Remove highlight from all results
      searchResults.forEach(result => {
        result.classList.remove('current-search-result');
      });
      
      // Add highlight to current result
      searchResults[index].classList.add('current-search-result');
      
      // Scroll to the result
      searchResults[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentSearchIndex(0);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getUserAvatar = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    return user?.photoURL || undefined;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    return user?.displayName || 'Anonymous';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const highlightSearchText = (text: string) => {
    if (!searchQuery) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={i} style={{ backgroundColor: '#FFEB3B', fontWeight: 'bold' }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (isSearchActive) {
      setSearchQuery(''); // Clear search when closing
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleGroupInfoOpen = () => {
    setIsGroupInfoOpen(true);
    handleMenuClose();
  };

  const handleGroupInfoClose = () => {
    setIsGroupInfoOpen(false);
  };

  const handleGifButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setGifAnchorEl(event.currentTarget);
    fetchTrendingGifs();
  };

  const handleGifClose = () => {
    setGifAnchorEl(null);
    setGifSearchQuery('');
  };

  const fetchTrendingGifs = async () => {
    setIsLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=chatroom_app&limit=20`);
      const data = await response.json();
      
      const formattedGifs = data.results.map((gif: any) => ({
        id: gif.id,
        url: gif.media_formats.gif.url,
        preview: gif.media_formats.nanogif.url
      }));
      
      setGifs(formattedGifs);
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
    } finally {
      setIsLoadingGifs(false);
    }
  };

  const searchGifs = async () => {
    if (!gifSearchQuery.trim()) {
      fetchTrendingGifs();
      return;
    }
    
    setIsLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&client_key=chatroom_app&q=${encodeURIComponent(gifSearchQuery)}&limit=20`);
      const data = await response.json();
      
      const formattedGifs = data.results.map((gif: any) => ({
        id: gif.id,
        url: gif.media_formats.gif.url,
        preview: gif.media_formats.nanogif.url
      }));
      
      setGifs(formattedGifs);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setIsLoadingGifs(false);
    }
  };

  const handleGifSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGifSearchQuery(e.target.value);
  };

  const handleGifSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs();
  };

  const handleGifSelect = (gif: TenorGif) => {
    if (!auth.currentUser) return;
    
    try {
      addDoc(collection(db, 'messages'), {
        text: '',
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        createdAt: new Date(),
        gifUrl: gif.url,
        groupId: currentGroupId, // Add the groupId to the GIF message
      });
      handleGifClose();
    } catch (error) {
      console.error('Error sending GIF:', error);
    }
  };

  const handleUserClick = (userId: string) => {
    // Navigate to the profile page with the user ID as a query parameter
    navigate(`/profile?userId=${userId}`);
  };

  const handleClearChatOpen = () => {
    setIsClearChatDialogOpen(true);
    handleMenuClose();
  };

  const handleClearChatClose = () => {
    setIsClearChatDialogOpen(false);
  };

  const handleClearChat = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Get all messages for the current group
      const messagesQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', currentGroupId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Delete each message
      const deletePromises = messagesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      // Clear local messages state
      setMessages([]);
      
      // Close the dialog
      setIsClearChatDialogOpen(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
      // Still close the dialog even if there's an error
      setIsClearChatDialogOpen(false);
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/chat?groupId=${groupId}`);
  };

  const handleClipButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'messages'), {
        text: '',
        imageUrl: url,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        createdAt: new Date(),
        groupId: currentGroupId,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <style>
        {`
          .search-result {
            transition: background-color 0.3s ease;
          }
          .current-search-result {
            background-color: rgba(255, 235, 59, 0.3);
            border-radius: 8px;
            padding: 4px;
          }
        `}
      </style>

      {/* Sidebar */}
      <Paper 
        elevation={3} 
        sx={{ 
          width: 320, 
          height: '100%', 
          display: { xs: 'none', md: 'flex' }, 
          flexDirection: 'column',
          borderRadius: 0,
          borderRight: '1px solid rgba(0, 0, 0, 0.12)'
        }}
      >
        {/* Sidebar Header */}
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#075E54',
            color: 'white'
          }}
        >
          <Avatar sx={{ bgcolor: '#128C7E', mr: 2 }}>
            <GroupIcon />
          </Avatar>
          <Typography variant="h6">Chat Groups</Typography>
        </Box>

        {/* Sidebar Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {/* Groups List */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              px: 2, 
              py: 1, 
              color: '#128C7E',
              fontWeight: 'bold'
            }}
          >
            Your Groups
          </Typography>
          
          <List sx={{ width: '100%', p: 0 }}>
            {/* Default Group */}
            <ListItem 
              sx={{ 
                py: 1,
                px: 2,
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                cursor: 'pointer',
                backgroundColor: !groupId ? 'rgba(18, 140, 126, 0.1)' : 'transparent'
              }}
              onClick={() => navigate('/chat')}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#128C7E' }}>
                  <GroupIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Default Group" 
                secondary="All users" 
              />
            </ListItem>
            
            {/* User's Groups */}
            {groups.map((group) => (
              <ListItem 
                key={group.id}
                sx={{ 
                  py: 1,
                  px: 2,
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  cursor: 'pointer',
                  backgroundColor: groupId === group.id ? 'rgba(18, 140, 126, 0.1)' : 'transparent'
                }}
                onClick={() => handleGroupClick(group.id)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#128C7E' }}>
                    <GroupIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={group.name} 
                  secondary={`${group.members.length} members`} 
                />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Group Members */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              px: 2, 
              py: 1, 
              color: '#128C7E',
              fontWeight: 'bold'
            }}
          >
            Members
          </Typography>
          
          <List sx={{ width: '100%', p: 0 }}>
            {users.map((user) => (
              <ListItem 
                key={user.uid}
                sx={{ 
                  py: 1,
                  px: 2,
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  cursor: 'pointer'
                }}
                onClick={() => handleUserClick(user.uid)}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={user.photoURL} 
                    sx={{ bgcolor: '#128C7E' }}
                  >
                    {getInitials(user.displayName)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user.displayName} 
                  secondary={user.uid === auth.currentUser?.uid ? 'You' : ''} 
                />
                {user.uid === auth.currentUser?.uid && (
                  <Typography variant="caption" color="textSecondary">
                    Admin
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* WhatsApp-like header */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#075E54',
            color: 'white',
            borderRadius: 0
          }}
        >
          <Avatar sx={{ bgcolor: '#128C7E', mr: 2 }}>
            <GroupIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{groupName}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {users.length} {users.length === 1 ? 'participant' : 'participants'}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={toggleSearch}>
            <SearchIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                '& .MuiMenuItem-root': { px: 2, py: 1 },
              },
            }}
          >
            <MenuItem onClick={handleGroupInfoOpen}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#128C7E' }}>
                  <GroupIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Group Info" 
                secondary="View group members" 
              />
            </MenuItem>
            <MenuItem onClick={handleClearChatOpen}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#128C7E' }}>
                  <DeleteIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Clear chat" 
                secondary="Delete all messages in this chat" 
              />
            </MenuItem>
          </Menu>
        </Paper>

        {/* Search bar */}
        {isSearchActive && (
          <Paper elevation={0} sx={{ p: 1, backgroundColor: '#f0f2f5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={handleSearchChange}
                size="small"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={clearSearch}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>✕</Typography>
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            {searchQuery && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  {searchResultsCount} {searchResultsCount === 1 ? 'result' : 'results'}
                </Typography>
                <Box>
                  <IconButton 
                    size="small" 
                    onClick={navigateToPreviousResult}
                    disabled={searchResultsCount === 0}
                  >
                    <Typography variant="body2">↑</Typography>
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={navigateToNextResult}
                    disabled={searchResultsCount === 0}
                  >
                    <Typography variant="body2">↓</Typography>
                  </IconButton>
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* Messages area */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#E5DDD5',
            backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png")',
            backgroundRepeat: 'repeat',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            filteredMessages.map((message, index) => {
              const isCurrentUser = message.userId === auth.currentUser?.uid;
              const showAvatar = index === 0 || filteredMessages[index - 1]?.userId !== message.userId;
              const showName = index === 0 || filteredMessages[index - 1]?.userId !== message.userId;
              
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    mb: 1,
                    alignItems: 'flex-end',
                  }}
                  className={searchQuery && message.text.toLowerCase().includes(searchQuery.toLowerCase()) ? 'search-result' : ''}
                  id={`message-${message.id}`}
                >
                  {!isCurrentUser && showAvatar && (
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        bgcolor: '#128C7E',
                        fontSize: '0.875rem'
                      }}
                      src={getUserAvatar(message.userId)}
                    >
                      {getInitials(getUserName(message.userId))}
                    </Avatar>
                  )}
                  {!isCurrentUser && !showAvatar && <Box sx={{ width: 33, mr: 1 }} />}
                  
                  <Box sx={{ maxWidth: '70%' }}>
                    {showName && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          ml: 1, 
                          color: '#128C7E', 
                          fontWeight: 'bold',
                          display: 'block',
                          mb: 0.5,
                          textAlign: isCurrentUser ? 'right' : 'left'
                        }}
                      >
                        {getUserName(message.userId)}
                      </Typography>
                    )}
                    
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: isCurrentUser ? '#DCF8C6' : 'white',
                        position: 'relative',
                        '&:before': isCurrentUser ? {
                          content: '""',
                          position: 'absolute',
                          right: 0,
                          bottom: 0,
                          width: 0,
                          height: 0,
                          border: '15px solid transparent',
                          borderBottomColor: '#DCF8C6',
                          borderRightColor: '#DCF8C6',
                          transform: 'translate(100%, 0)',
                        } : {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          bottom: 0,
                          width: 0,
                          height: 0,
                          border: '15px solid transparent',
                          borderBottomColor: 'white',
                          borderLeftColor: 'white',
                          transform: 'translate(-100%, 0)',
                        }
                      }}
                    >
                      {isCurrentUser && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#128C7E', 
                            fontWeight: 'bold',
                            display: 'block',
                            mb: 0.5,
                            textAlign: 'right'
                          }}
                        >
                          You
                        </Typography>
                      )}
                      {message.gifUrl ? (
                        <Box sx={{ mb: 1 }}>
                          <img 
                            src={message.gifUrl} 
                            alt="GIF" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: 200,
                              borderRadius: 4
                            }} 
                          />
                        </Box>
                      ) : (
                        <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                          {highlightSearchText(message.text)}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          {moment(message.createdAt.toDate()).format('h:mm A')}
                        </Typography>
                        {isCurrentUser && (
                          <Tooltip title="Delete message">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMessage(message.id, message.userId)}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Input area */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 1.5, 
            backgroundColor: '#f0f2f5',
            borderRadius: 0
          }}
        >
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handleGifButtonClick}>
                <EmojiEmotionsIcon />
              </IconButton>
              <IconButton onClick={handleClipButtonClick} disabled={uploading}>
                <AttachFileIcon />
              </IconButton>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 5,
                    backgroundColor: 'white',
                  }
                }}
              />
              <IconButton 
                type="submit" 
                color="primary"
                disabled={!newMessage.trim()}
                sx={{ 
                  backgroundColor: '#128C7E',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#075E54',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#cccccc',
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </form>
          {uploading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">Uploading image...</Typography>
            </Box>
          )}
        </Paper>

        {/* GIF Popover */}
        <Popover
          open={Boolean(gifAnchorEl)}
          anchorEl={gifAnchorEl}
          onClose={handleGifClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: {
              width: 320,
              maxHeight: 400,
              p: 1
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 'bold' }}>
                GIFs
              </Typography>
              <IconButton size="small" onClick={handleGifClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <form onSubmit={handleGifSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search GIFs..."
                value={gifSearchQuery}
                onChange={handleGifSearchChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" type="submit">
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />
            </form>
            
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {isLoadingGifs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Grid container spacing={1}>
                  {gifs.map((gif) => (
                    <Grid item xs={6} key={gif.id}>
                      <Box 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 }
                        }}
                        onClick={() => handleGifSelect(gif)}
                      >
                        <img 
                          src={gif.preview} 
                          alt="GIF" 
                          style={{ 
                            width: '100%', 
                            height: 'auto',
                            borderRadius: 4
                          }} 
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        </Popover>

        {/* Group Info Dialog */}
        <Dialog 
          open={isGroupInfoOpen} 
          onClose={handleGroupInfoClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#075E54',
            color: 'white'
          }}>
            <Avatar sx={{ bgcolor: '#128C7E', mr: 2 }}>
              <GroupIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{groupName}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {users.length} {users.length === 1 ? 'participant' : 'participants'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <List sx={{ width: '100%' }}>
              <ListItem>
                <ListItemText 
                  primary="Group Members" 
                  primaryTypographyProps={{ 
                    variant: 'subtitle1', 
                    fontWeight: 'bold',
                    sx: { color: '#128C7E' }
                  }} 
                />
              </ListItem>
              <Divider />
              {users.map((user) => (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar 
                      src={user.photoURL} 
                      sx={{ bgcolor: '#128C7E' }}
                    >
                      {getInitials(user.displayName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={user.displayName} 
                    secondary={user.uid === auth.currentUser?.uid ? 'You' : ''} 
                  />
                  {user.uid === auth.currentUser?.uid && (
                    <Typography variant="caption" color="textSecondary">
                      Admin
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleGroupInfoClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear Chat Confirmation Dialog */}
        <Dialog
          open={isClearChatDialogOpen}
          onClose={handleClearChatClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#075E54',
            color: 'white'
          }}>
            <Avatar sx={{ bgcolor: '#128C7E', mr: 2 }}>
              <DeleteIcon />
            </Avatar>
            <Typography variant="h6">Clear Chat</Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Typography>
              Are you sure you want to clear all messages in this chat? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClearChatClose}>Cancel</Button>
            <Button 
              onClick={handleClearChat}
              variant="contained"
              color="error"
            >
              Clear Chat
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default ChatRoom; 