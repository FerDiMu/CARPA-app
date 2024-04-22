// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyACZwqzbnrEQx0mN_HR_4sZw7UbwP_fy_k",
  authDomain: "eye-tracking-experiment.firebaseapp.com",
  projectId: "eye-tracking-experiment",
  storageBucket: "eye-tracking-experiment.appspot.com",
  messagingSenderId: "242232015080",
  appId: "1:242232015080:web:c07236634d32612245b15d"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export function initFirebase() {
    return app;
}

export const dbf = getFirestore(app)