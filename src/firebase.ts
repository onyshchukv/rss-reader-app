import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAmBqZibrOmiE-330KdopGWaJ3kev9dEUU",
  authDomain: "allrss.firebaseapp.com",
  projectId: "allrss",
  storageBucket: "allrss.appspot.com",
  messagingSenderId: "988292908154",
  appId: "1:988292908154:web:729a1696ef2bedf8ca67c3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();