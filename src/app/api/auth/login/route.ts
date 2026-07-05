import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, User } from "@/lib/firestore";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  const snapshot = await db.collection("users").where("email", "==", email.toLowerCase()).get();
  if (snapshot.empty) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const user = snapshot.docs[0].data() as User;
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const token = await signToken({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
  res.cookies.set("session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}
