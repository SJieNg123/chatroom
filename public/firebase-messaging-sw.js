importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAa2Y52RArOnL4DdmXjflTSIDanm2jSzn4",
    authDomain: "chatroom-29fc3.firebaseapp.com",
    databaseURL: "https://chatroom-29fc3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chatroom-29fc3",
    storageBucket: "chatroom-29fc3.firebasestorage.app",
    messagingSenderId: "789760414297",
    appId: "1:789760414297:web:83b63d39c89bda3597d748"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'notification-1'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 