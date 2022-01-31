// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB4fes94TPN-lcqwQ0R2CJ7QwJS5Me-QF0",
    authDomain: "danielsweb3d.firebaseapp.com",
    projectId: "danielsweb3d",
    storageBucket: "danielsweb3d.appspot.com",
    messagingSenderId: "986252284307",
    appId: "G-T3F6G2PT4E",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)

export {auth, app}