import { auth, db } from '$lib/firebase.js';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, documentId, onSnapshot, doc, setDoc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { get } from 'svelte/store';
import { currentUser, txData, settings, loadingData, minLoadMonth, maxLoadMonth } from '$lib/stores.js';
import dayjs from 'dayjs';
import { sortedUniqueArray } from '$lib/utils/utils.js';

const MONTH_FORMAT = 'YYYY-MM';

let unsubSettings = null;
let unsubMonths = null;
let allListenMonths = [];

function setupMonthListener(minM, maxM) {
  if (!minM || !maxM) return;

  // Build the full list of months in range
  let months = [];
  let m = minM;
  while (m <= maxM) {
    months.push(m);
    m = dayjs(m + '-01').add(1, 'month').format(MONTH_FORMAT);
  }

  const newMonths = months.filter((m) => !allListenMonths.includes(m));
  if (newMonths.length === 0) return;

  allListenMonths = sortedUniqueArray({ array: allListenMonths.concat(months) });

  if (unsubMonths) unsubMonths();

  const q = query(
    collection(db, 'months'),
    where(documentId(), '>=', allListenMonths[0]),
    where(documentId(), '<=', allListenMonths[allListenMonths.length - 1])
  );

  unsubMonths = onSnapshot(q, (snap) => {
    loadingData.set(true);
    let newData = {};
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      let transactions = (data.transactions || []).map((tx) => {
        // Normalise legacy "comment" field
        if ('comment' in tx && !('comments' in tx)) {
          return { ...tx, comments: tx.comment };
        }
        return tx;
      });
      newData[doc.id] = transactions.map((tx, idx) => ({ ...tx, _rowIdx: idx }));
    }
    txData.update((d) => ({ ...d, ...newData }));
    loadingData.set(false);
  });
}

export function initAuth(onNoUser) {
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    currentUser.set(user ?? null);

    if (user) {
      if (!unsubSettings) {
        const q = query(
          collection(db, 'settings'),
          where(documentId(), 'in', ['categoryChanges', 'metaCategories', 'general'])
        );
        unsubSettings = onSnapshot(q, (snap) => {
          let s = {};
          for (const doc of snap.docs) s[doc.id] = doc.data() || {};
          settings.set(s);

          if (s.general) {
            const minM = dayjs(s.general.maxMonth).subtract(11, 'month').format(MONTH_FORMAT);
            const maxM = dayjs(s.general.maxMonth).format(MONTH_FORMAT);
            // Only set defaults if not already set
            if (!get(minLoadMonth)) minLoadMonth.set(minM);
            if (!get(maxLoadMonth)) maxLoadMonth.set(maxM);
            setupMonthListener(get(minLoadMonth), maxM);
          }
        });
      }
    } else {
      onNoUser();
    }
  });

  // Expand the Firestore listener whenever minLoadMonth is pushed earlier
  const unsubMin = minLoadMonth.subscribe((minM) => {
    const maxM = get(maxLoadMonth);
    if (minM && maxM) setupMonthListener(minM, maxM);
  });

  return () => {
    unsubAuth();
    unsubMin();
    if (unsubSettings) { unsubSettings(); unsubSettings = null; }
    if (unsubMonths) { unsubMonths(); unsubMonths = null; }
    allListenMonths = [];
  };
}

// Returns { [month]: count } for each month written
export async function saveTransactions(rows) {
  // Strip internal UI fields; omit 'questions'
  const clean = rows.map(({ _id, _transferGroup, questions, ...tx }) => tx);

  // Group by YYYY-MM
  const byMonth = {};
  for (const tx of clean) {
    const month = tx.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(tx);
  }

  const months = Object.keys(byMonth).sort();

  // For each month: fetch existing transactions, append, write back
  await Promise.all(months.map(async (month) => {
    const ref = doc(db, 'months', month);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().transactions ?? []) : [];
    await setDoc(ref, { transactions: [...existing, ...byMonth[month]] }, { merge: true });
  }));

  // Update settings/general minMonth / maxMonth
  const generalRef = doc(db, 'settings', 'general');
  const generalSnap = await getDoc(generalRef);
  if (generalSnap.exists()) {
    const { minMonth, maxMonth } = generalSnap.data();
    const newMin = months[0];
    const newMax = months[months.length - 1];
    const updates = {};
    if (!minMonth || newMin < minMonth) updates.minMonth = newMin;
    if (!maxMonth || newMax > maxMonth) updates.maxMonth = newMax;
    if (Object.keys(updates).length) await updateDoc(generalRef, updates);
  }

  return Object.fromEntries(months.map((m) => [m, byMonth[m].length]));
}

export async function savePendingUploads(rows) {
  const ref = doc(db, 'pending', 'pending_uploads');
  await setDoc(ref, { rows });
}

export async function loadPendingUploads() {
  const ref = doc(db, 'pending', 'pending_uploads');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().rows ?? null;
}

export async function clearPendingUploads() {
  const ref = doc(db, 'pending', 'pending_uploads');
  await setDoc(ref, { rows: [] });
}

export async function updateTransaction(tx, updates) {
  const oldMonth = tx.date.slice(0, 7);
  const newMonth = (updates.date ?? tx.date).slice(0, 7);

  const oldRef = doc(db, 'months', oldMonth);
  const oldSnap = await getDoc(oldRef);
  if (!oldSnap.exists()) throw new Error(`Month document ${oldMonth} not found`);

  const stored = oldSnap.data().transactions ?? [];
  if (tx._rowIdx === undefined || tx._rowIdx >= stored.length) {
    throw new Error('Cannot locate transaction in stored data');
  }

  const updatedTx = { ...stored[tx._rowIdx], ...updates };

  if (newMonth === oldMonth) {
    const newTransactions = [...stored];
    newTransactions[tx._rowIdx] = updatedTx;
    await setDoc(oldRef, { transactions: newTransactions }, { merge: true });
  } else {
    // Date moved to a different month — remove from old, append to new
    const filteredOld = stored.filter((_, i) => i !== tx._rowIdx);
    await setDoc(oldRef, { transactions: filteredOld }, { merge: true });

    const newRef = doc(db, 'months', newMonth);
    const newSnap = await getDoc(newRef);
    const newExisting = newSnap.exists() ? (newSnap.data().transactions ?? []) : [];
    await setDoc(newRef, { transactions: [...newExisting, updatedTx] }, { merge: true });
  }
}

export async function deleteTransaction(tx) {
  const month = tx.date.slice(0, 7);
  const ref = doc(db, 'months', month);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Month document ${month} not found`);
  const stored = snap.data().transactions ?? [];
  if (tx._rowIdx === undefined || tx._rowIdx >= stored.length) {
    throw new Error('Cannot locate transaction in stored data');
  }
  const newTransactions = stored.filter((_, i) => i !== tx._rowIdx);
  await setDoc(ref, { transactions: newTransactions }, { merge: true });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (!window.confirm('Are you sure you want to sign out?')) return;
  await signOut(auth);
}
