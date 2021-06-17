import { useContext } from "react";
import { AuthContext } from "./auth/Auth";
import { app } from "./firebase";
import Table from "./table/Table";

const Home = ({ history }) => {
  const { currentUser, setCurrentUser, txData } =
    useContext(AuthContext);
  if (!!!currentUser) {
    history.push("/login");
  }
  const signOutFunc = () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) {
      return;
    }
    app.auth().signOut();
    setCurrentUser();
    history.push("/login");
  };
  let allTx = [];
  if (!!txData) {
    for (const k of Object.keys(txData)) {
      allTx = allTx.concat(txData[k]);
    }
  }
  return (
    <>
      <button onClick={signOutFunc}>Sign Out</button>
      <Table transactions={allTx} />
    </>
  );
};

export default Home;
