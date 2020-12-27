const firebase = require("firebase");
const d3 = require('d3');

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