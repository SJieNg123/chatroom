# ChatRoom App

A modern real-time chat application built with React, TypeScript, and Firebase. This application allows users to create accounts, join chat rooms, and communicate with other users in real-time.

## Features

- Email and Google Authentication
- Real-time messaging
- Message search functionality
- User profiles with editable information
- Profile picture upload
- Message deletion
- User blocking
- Responsive design
- Modern UI with Material-UI components

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd chatroom-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password and Google providers)
   - Create a Firestore database
   - Enable Storage

4. Configure Firebase:
   - Copy your Firebase configuration from the Firebase Console
   - Replace the configuration in `src/config/firebase.ts` with your own

5. Start the development server:
```bash
npm start
```

## Firebase Configuration

Update the `src/config/firebase.ts` file with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App

## Project Structure

```
src/
  ├── components/
  │   ├── auth/
  │   │   ├── SignIn.tsx
  │   │   └── SignUp.tsx
  │   ├── chat/
  │   │   └── ChatRoom.tsx
  │   ├── profile/
  │   │   └── UserProfile.tsx
  │   └── navigation/
  │       └── Navigation.tsx
  ├── config/
  │   └── firebase.ts
  ├── App.tsx
  └── index.tsx
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 