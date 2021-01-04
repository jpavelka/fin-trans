const firebase = require("firebase");
var firebaseui = require('firebaseui');

var uiConfig = {
    signInSuccessUrl: './',
    signInOptions: [
        // firebase.default.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.default.auth.GoogleAuthProvider.PROVIDER_ID,
    ],
    tosUrl: './tos.html',
    privacyPolicyUrl: function() {
        window.location.assign('./privacy.html');
    }
}
var ui = new firebaseui.auth.AuthUI(firebase.default.auth());
ui.start('#firebaseui-auth-container', uiConfig);