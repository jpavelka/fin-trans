import React, { useEffect, useState } from 'react';
import { app, db } from '../firebase';
import dayjs from 'dayjs';

export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
    const [minMonth, setMinMonth] = useState(dayjs().add(-11, 'month'));
    const [maxMonth, setMaxMonth] = useState(dayjs());
    const [txData, setTxData] = useState();
    const [currentUser, setCurrentUser] = useState();
    useEffect(() => {
        app.auth().onAuthStateChanged((user) => {
            if (!!user){
                setCurrentUser(user);
                const now = dayjs();
                let month = minMonth;
                while (month < now){
                    const monthStr = month.format('YYYY-MM');
                    if (!Object.keys(txData || {}).includes(monthStr)){
                        db.collection('months').doc(monthStr).onSnapshot((doc) => {
                            const data = doc.data() || {};
                            setTxData(d => {
                                let newData = {};
                                newData[monthStr] = data.transactions || [];
                                return {...d, ...newData}
                            })
                        })
                    }
                    month = month.add(1, 'month');
                }
            }
        });
    }, [minMonth, txData]);
    useEffect(() => {
        const maxMonthStr = maxMonth.format('YYYY-MM');
        if (Object.keys(txData || {}).includes(maxMonthStr)){
            if (txData[maxMonthStr].length === 0){
                setMaxMonth(m => m.add(-1, 'month'))
                setMinMonth(m => m.add(-1, 'month'))
            }
        }
    }, [txData, maxMonth])
    console.log(minMonth.format('YYYY-MM'), maxMonth.format('YYYY-MM'))
    return (
        <AuthContext.Provider
            value={{
                currentUser, txData, setMinMonth, setCurrentUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};