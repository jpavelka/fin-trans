import React, { useEffect, useState } from "react";
import { app, db } from "../firebase";
import dayjs from "dayjs";

export const AuthContext = React.createContext();
const monthFormat = "YYYY-MM";

export const AuthProvider = ({ children }) => {
  const [minLoadMonth, setMinLoadMonth] = useState();
  const [maxLoadMonth, setMaxLoadMonth] = useState();
  const [txData, setTxData] = useState();
  const [settings, setSettings] = useState({});
  const [currentUser, setCurrentUser] = useState();
  useEffect(() => {
    app.auth().onAuthStateChanged((user) => {
      if (!!user) {
        setCurrentUser(user);
        for (const k of ["categoryChanges", "metaCategories", "general"]) {
          if (!Object.keys(settings).includes(k)) {
            db.collection("settings")
              .doc(k)
              .onSnapshot((doc) => {
                setSettings((s) => {
                  let newData = {};
                  newData[k] = doc.data();
                  return { ...s, ...newData };
                });
              });
          }
        }
        if (!!settings.general) {
          if (minLoadMonth !== settings.general.minMonth) {
            setMinLoadMonth(
              dayjs(settings.general.maxMonth)
                .add(-11, "month")
                .format(monthFormat)
            );
            setMaxLoadMonth(
              dayjs(settings.general.maxMonth).format(monthFormat)
            );
          }
          let month = dayjs(minLoadMonth + '-01').format(monthFormat);
          while (month <= maxLoadMonth) {
            const m = month;
            if (!Object.keys(txData || {}).includes(m)) {
              db.collection("months")
                .doc(m)
                .onSnapshot((doc) => {
                  const data = doc.data() || {};
                  setTxData((d) => {
                    let newData = {};
                    newData[m] = data.transactions || [];
                    return { ...d, ...newData };
                  });
                });
            }
            month = dayjs(month + '-01').add(1, "month").format(monthFormat);
          }
        }
      }
    });
  }, [minLoadMonth, maxLoadMonth, txData, settings, setMinLoadMonth]);
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        txData,
        setMinLoadMonth,
        setCurrentUser,
        settings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
