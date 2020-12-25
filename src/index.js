const firebase = require("firebase");
const d3 = require('d3');

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

firebase.default.auth().onAuthStateChanged(user => {
    if (user){

    } else {
        window.location.assign('/login.html')
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
    }
})

var db = firebase.default.firestore();

let mainDiv = d3.select('body')
mainDiv.append('button').attr('id', 'logout-btn').text('log out')
const logoutBtn = document.querySelector('#logout-btn');
logoutBtn.addEventListener('click', e => {
  e.preventDefault();
  firebase.default.auth().signOut();
  console.log('User signed out!');
})
db.collection("transactions").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
        data = doc.data();
        mainDiv.append('div').text(data.amount + ' - ' + data.description)
    });
});