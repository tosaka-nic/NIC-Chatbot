import { NextRequest, NextResponse } from "next/server";
import { db, KBItem } from "@/lib/firestore";
import { checkIsAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const { id } = await params;
  await db.collection("items").doc(id).delete();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const { id } = await params;
  const { question, answer, category } = await req.json();

  if (!question || !answer || !category) {
    return NextResponse.json({ error: "question, answer, category は必須です" }, { status: 400 });
  }

  await db.collection("items").doc(id).update({ question, answer, category });
  const doc = await db.collection("items").doc(id).get();
  return NextResponse.json(doc.data());
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { type } = await req.json() as { type: "up" | "down" };

  const ref = db.collection("items").doc(id);
  const field = type === "up" ? "votes_up" : "votes_down";

  await db.runTransaction(async t => {
    const doc = await t.get(ref);
    const current = (doc.data() as KBItem)[field];
    t.update(ref, { [field]: current + 1 });
  });

  const doc = await ref.get();
  const data = doc.data() as KBItem;
  return NextResponse.json({ votes_up: data.votes_up, votes_down: data.votes_down });
}
