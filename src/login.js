const firebase = require("firebase");
var firebaseui = require('firebaseui');

  
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

// firebase.default.auth().onAuthStateChanged(user => {
//     if (user){
//         window.location.assign('/')
//     } else {
var uiConfig = {
    signInSuccessUrl: '/',
    signInOptions: [
        firebase.default.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.default.auth.GoogleAuthProvider.PROVIDER_ID,
    ],
    tosUrl: '/',
    privacyPolicyUrl: function() {
        window.location.assign('/');
    }
}
var ui = new firebaseui.auth.AuthUI(firebase.default.auth());
ui.start('#firebaseui-auth-container', uiConfig);
//     }
// })

