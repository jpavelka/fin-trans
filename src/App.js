import Login from "./auth/Login";
import Home from "./Home";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthProvider } from "./auth/Auth";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        {/* <ScrollToTop /> */}
        {/* <Menu /> */}
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/login" component={Login} />
        </Switch>
      </Router>
    </AuthProvider>
  );
};

export default App;
