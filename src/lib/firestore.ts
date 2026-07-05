import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFileSync, existsSync } from "fs";

if (!getApps().length) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // Vercel / その他: GOOGLE_CREDENTIALS_JSON 環境変数からADC認証情報を書き出す
    if (process.env.GOOGLE_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = "/tmp/gcloud-credentials.json";
      if (!existsSync(credPath)) {
        writeFileSync(credPath, process.env.GOOGLE_CREDENTIALS_JSON);
      }
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    }
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? "nic-chatbot",
    });
  }
}

export const db = getFirestore();

export interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  votes_up: number;
  votes_down: number;
  created_at: string;
  added_by: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
