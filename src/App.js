import Login from "./auth/Login";
import Home from "./Home";
import LoadData from "./loadData/LoadData";
import NavMenu from "./nav/Nav";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthProvider } from "./auth/Auth";
import EditTransactions from "./edit/EditTransactions";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <NavMenu />
        <Switch>
          <div style={{ margin: "5pt" }}>
            <Route exact path="/" component={Home} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/upload" component={LoadData} />
            <Route exact path="/edit" component={EditTransactions} />
          </div>
        </Switch>
      </Router>
    </AuthProvider>
  );
};

export default App;
