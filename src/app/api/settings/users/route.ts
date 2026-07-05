import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db, User } from "@/lib/firestore";
import { checkIsAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const snapshot = await db.collection("users").orderBy("created_at").get();
  const users = snapshot.docs.map(d => {
    const u = d.data() as User;
    return { id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at };
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const { name, email, password, role } = await req.json() as { name: string; email: string; password: string; role: string };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "名前・メール・パスワードは必須です" }, { status: 400 });
  }

  const existing = await db.collection("users").where("email", "==", email.toLowerCase()).get();
  if (!existing.empty) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
  }

  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const today = new Date().toISOString().split("T")[0];
  const user: User = { id, name, email: email.toLowerCase(), password_hash: hash, role: role === "admin" ? "admin" : "user", created_at: today };

  await db.collection("users").doc(id).set(user);
  return NextResponse.json({ id, name, email: user.email, role: user.role, created_at: today }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const { id } = await req.json() as { id: string };

  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  const target = doc.data() as User;
  if (target.role === "admin") {
    const adminSnap = await db.collection("users").where("role", "==", "admin").get();
    if (adminSnap.size <= 1) {
      return NextResponse.json({ error: "最後の管理者は削除できません" }, { status: 400 });
    }
  }

  await db.collection("users").doc(id).delete();
  return NextResponse.json({ ok: true });
}
