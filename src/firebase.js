import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCYx7L4tM0zXi7qWetcFZJVbrz5W0tjIrg',
  authDomain: 'casamentoheldervanessa.firebaseapp.com',
  projectId: 'casamentoheldervanessa',
  storageBucket: 'casamentoheldervanessa.firebasestorage.app',
  messagingSenderId: '888726908835',
  appId: '1:888726908835:web:23b658b23662561ad67416',
}

let app, auth, db

try {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} catch (e) {
  console.warn('Firebase not configured:', e.message)
}

export { auth, db }
