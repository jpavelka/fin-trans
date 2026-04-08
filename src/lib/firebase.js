import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey:            'AIzaSyDIpxHzHlYDZ1jthEAl5FqVVvH1-Wa-iic',
  authDomain:        'finances-270712.firebaseapp.com',
  databaseURL:       'https://finances-270712.firebaseio.com',
  projectId:         'finances-270712',
  storageBucket:     'finances-270712.appspot.com',
  messagingSenderId: '974035741943',
});

export const auth = getAuth(app);
export const db = getFirestore(app);
