import { NextRequest, NextResponse } from "next/server";
import { db, KBItem } from "@/lib/firestore";
import { randomUUID } from "crypto";
import { checkIsAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const category = searchParams.get("category") ?? "";

  const snapshot = await db.collection("items").orderBy("votes_up", "desc").get();
  let items = snapshot.docs.map(d => d.data() as KBItem);

  if (q) {
    items = items.filter(item =>
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q)
    );
  }
  if (category) {
    items = items.filter(item => item.category === category);
  }

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const { question, answer, category, added_by } = await req.json();

  if (!question || !answer || !category) {
    return NextResponse.json({ error: "question, answer, category は必須です" }, { status: 400 });
  }

  const id = randomUUID();
  const created_at = new Date().toISOString().split("T")[0];
  const item: KBItem = { id, question, answer, category, votes_up: 0, votes_down: 0, created_at, added_by: added_by ?? "社員" };

  await db.collection("items").doc(id).set(item);
  return NextResponse.json(item, { status: 201 });
}
