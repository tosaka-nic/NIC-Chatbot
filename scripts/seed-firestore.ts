import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env.local") });

if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
} else {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? "nic-chatbot",
  });
}

const db = getFirestore();

async function seed() {
  console.log("Seeding Firestore...");

  // ナレッジシードデータ
  const items = [
    { id: "s1", question: "Windowsがブルースクリーンになった",   answer: "① 最近のソフト・ドライバを確認\n② セーフモードで起動して切り分け\n③ エラーコードをメモしてSEへ連絡",              category: "PC・ハードウェア",      votes_up: 8,  votes_down: 0, created_at: "2024-06-01", added_by: "SE" },
    { id: "s2", question: "プリンターに接続できない",             answer: "① 電源とケーブルを確認\n② 設定>デバイスでプリンター状態を確認\n③ ドライバーを再インストール",                       category: "PC・ハードウェア",      votes_up: 15, votes_down: 2, created_at: "2024-06-05", added_by: "SE" },
    { id: "s3", question: "Outlookでメールが送受信できない",      answer: "① インターネット接続を確認\n② Outlookを再起動\n③ 送受信タブから手動実行\n④ アカウント設定を確認",                  category: "ソフトウェア・アプリ",  votes_up: 20, votes_down: 1, created_at: "2024-06-10", added_by: "SE" },
    { id: "s4", question: "Teamsの音声・カメラが使えない",        answer: "① Teams設定>デバイスでマイク/カメラを確認\n② Windowsのプライバシー設定でアクセスを許可\n③ PCを再起動",            category: "ソフトウェア・アプリ",  votes_up: 11, votes_down: 0, created_at: "2024-06-15", added_by: "社員" },
    { id: "s5", question: "パスワードを忘れた",                  answer: "① ログイン画面の「パスワードを忘れた」からリセット\n② それでも無理な場合はSEに申請\n③ 次回から1Passwordなどのパスワードマネージャーを活用", category: "アカウント・権限", votes_up: 25, votes_down: 0, created_at: "2024-06-20", added_by: "SE" },
    { id: "s6", question: "社内VPNに繋がらない",                answer: "① VPNクライアントを再起動\n② ネットワーク接続を確認\n③ 会社のIPが変わっていないか確認\n④ SEに連絡",             category: "ネットワーク",          votes_up: 9,  votes_down: 1, created_at: "2024-06-25", added_by: "社員" },
  ];

  for (const item of items) {
    await db.collection("items").doc(item.id).set(item);
    console.log(`  ✔ item: ${item.question}`);
  }

  // 管理者ユーザー
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const name = process.env.ADMIN_NAME ?? "管理者";
  const hash = bcrypt.hashSync(password, 10);
  const today = new Date().toISOString().split("T")[0];

  await db.collection("users").doc("admin-seed").set({
    id: "admin-seed", name, email: email.toLowerCase(),
    password_hash: hash, role: "admin", created_at: today,
  });
  console.log(`  ✔ admin user: ${email}`);

  console.log("Done!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
