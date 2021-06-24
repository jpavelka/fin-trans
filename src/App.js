import Login from "./auth/Login";
import Home from "./Home";
import LoadData from "./loadData/LoadData";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthProvider } from "./auth/Auth";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        {/* <Menu /> */}
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/upload" component={LoadData} />
        </Switch>
      </Router>
    </AuthProvider>
  );
};

export default App;
