const firebase = require("firebase");

firebase.default.auth().onAuthStateChanged(user => {
    if (user){

    } else {
        window.location.assign('./login.html')
    }
})