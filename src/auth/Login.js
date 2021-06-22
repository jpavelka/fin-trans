import firebase from "firebase/app";
import { useContext } from "react";
import { AuthContext } from "./Auth";

const Login = ({ history }) => {
  const { currentUser } = useContext(AuthContext);
  if (!!currentUser) {
    history.push("/");
  }
  const auth = firebase.auth();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  const signInWithGoogle = () => {
    auth
      .signInWithPopup(googleProvider)
      .then((res) => {
        history.push("/");
      })
      .catch((error) => {
        console.log(error.message);
      });
  };
  return (
    <button className="login-provider-button" onClick={signInWithGoogle}>
      <span>Sign in with Google</span>
    </button>
  );
};

export default Login;
