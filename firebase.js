// firebase.js
import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCPsG9zexwSJhq2owWi1LfZEkswr5xf8Ds',
  authDomain: 'linkedin-clone-d873d.firebaseapp.com',
  projectId: 'linkedin-clone-d873d',
  storageBucket: 'linkedin-clone-d873d.appspot.com',
  messagingSenderId: '474369294841',
  appId: '1:474369294841:web:761b56a7deec52f677fd28',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
