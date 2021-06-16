import { useContext } from 'react';
import { AuthContext } from './auth/Auth';
import { app } from './firebase';

const Home = ({ history }) => {
    const { currentUser, setCurrentUser, txData } = useContext(AuthContext);
    if (!!!currentUser){
        history.push('/login');
    }
    const signOutFunc = () => {
        const confirmed = window.confirm('Are you sure you want to sign out?');
        if (!confirmed){
            return
        }
        app.auth().signOut();
        setCurrentUser();
        history.push('/login');
    }
    return (
        <>
            <button onClick={signOutFunc}>Sign Out</button>
            <div>{JSON.stringify(Object.keys(txData || {}).filter(x => txData[x].length > 0).sort())}</div>
        </>
    )
}

export default Home