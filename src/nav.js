const firebase = require("firebase");

var firebaseConfig = {
    apiKey: "AIzaSyDIpxHzHlYDZ1jthEAl5FqVVvH1-Wa-iic",
    authDomain: "finances-270712.firebaseapp.com",
    databaseURL: "https://finances-270712.firebaseio.com",
    projectId: "finances-270712",
    storageBucket: "finances-270712.appspot.com",
    messagingSenderId: "974035741943",
    appId: "1:974035741943:web:f224ddab12679fe27477f2",
    measurementId: "G-ZKVF7P5MTW"
};
firebase.default.initializeApp(firebaseConfig);

const logoutBtn = document.querySelector('#logout-btn');
logoutBtn.addEventListener('click', e => {
  e.preventDefault();
  firebase.default.auth().signOut();
  window.location.assign('./login.html')
})