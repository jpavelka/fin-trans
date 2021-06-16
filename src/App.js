import Login from './auth/Login';
import Home from './Home';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { AuthProvider } from './auth/Auth';

const App = () => {
  return (
      <AuthProvider>
          <Router>
              {/* <ScrollToTop /> */}
              {/* <Menu /> */}
              <Switch>
                  <Route exact path='/' component={Home} />
                  <Route exact path='/login' component={Login} />
              </Switch>
          </Router>
      </AuthProvider>
  )
}


// function App() {
//   // const txData = useContext(AuthContext);
//   // console.log(txData);
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
