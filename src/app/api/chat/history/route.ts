import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const snapshot = await db
    .collection("chatHistory")
    .doc(session.sub)
    .collection("messages")
    .where("timestamp", ">=", sevenDaysAgo)
    .orderBy("timestamp", "asc")
    .get();

  return NextResponse.json(snapshot.docs.map(d => d.data()));
}
