import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Vercel: service account JSON stored in env var
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    initializeApp({ credential: cert(serviceAccount) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local dev: points to a service account JSON file on disk
    initializeApp({ credential: applicationDefault() })
  } else {
    // Google Cloud environments with auto-credentials
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
  }
}

export const adminDb = getFirestore()
