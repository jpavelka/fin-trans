import firebase from "firebase/app";
import React, { useEffect, useState } from "react";
import { app, db } from "../firebase";
import dayjs from "dayjs";
import { sortedUniqueArray } from "../utils/utils";

export const AuthContext = React.createContext();
const monthFormat = "YYYY-MM";

export const AuthProvider = ({ children }) => {
  const [minLoadMonth, setMinLoadMonth] = useState();
  const [maxLoadMonth, setMaxLoadMonth] = useState();
  const [allListenMonths, setAllListenMonths] = useState([]);
  const [txData, setTxData] = useState();
  const [settings, setSettings] = useState({});
  const [currentUser, setCurrentUser] = useState();
  const [loadingData, setLoadingData] = useState(true);
  useEffect(() => {
    app.auth().onAuthStateChanged((user) => {
      if (!!user) {
        setCurrentUser(user);
        if (Object.keys(settings).length === 0) {
          db.collection("settings")
            .where(firebase.firestore.FieldPath.documentId(), "in", [
              "categoryChanges",
              "metaCategories",
              "general",
            ])
            .onSnapshot((query) => {
              let newSettings = {};
              for (let doc of query.docs) {
                const k = doc.id;
                const data = doc.data() || {};
                newSettings[k] = data;
              }
              setSettings(newSettings);
            });
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
          let month = dayjs(minLoadMonth + "-01").format(monthFormat);
          let listenMonths = [];
          while (month <= maxLoadMonth) {
            const m = month;
            if (!Object.keys(txData || {}).includes(m)) {
              listenMonths.push(m);
            }
            month = dayjs(month + "-01")
              .add(1, "month")
              .format(monthFormat);
          }
          if (
            listenMonths.filter((m) => !allListenMonths.includes(m)).length > 0
          ) {
            const newAllListenMonths = sortedUniqueArray({
              array: allListenMonths.concat(listenMonths),
            });
            db.collection("months")
              .where(
                firebase.firestore.FieldPath.documentId(),
                ">=",
                newAllListenMonths[0]
              )
              .where(
                firebase.firestore.FieldPath.documentId(),
                "<=",
                newAllListenMonths[newAllListenMonths.length - 1]
              )
              .onSnapshot((query) => {
                setLoadingData(true);                
                let newData = {};
                for (let doc of query.docs) {
                  const m = doc.id;
                  const data = doc.data() || {};                  
                  newData[m] = data.transactions || [];
                }                
                setTxData((d) => {
                  return { ...d, ...newData };
                });
                setLoadingData(false);
              });
            setAllListenMonths(newAllListenMonths);
          }
        }
      }
    });
  }, [minLoadMonth, maxLoadMonth, txData, settings, allListenMonths]);
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        txData,
        setMinLoadMonth,
        setCurrentUser,
        settings,
        minLoadMonth,
        maxLoadMonth,
        loadingData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const signOutFunc = () => {
  const confirmed = window.confirm("Are you sure you want to sign out?");
  if (!confirmed) {
    return;
  }
  app.auth().signOut();
};

export { signOutFunc };
