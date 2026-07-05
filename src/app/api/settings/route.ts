import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export async function GET() {
  const doc = await db.collection("settings").doc("webhook_url").get();
  return NextResponse.json({ webhook_url: doc.data()?.value ?? "" });
}

export async function POST(req: NextRequest) {
  const { webhook_url } = await req.json() as { webhook_url: string };
  await db.collection("settings").doc("webhook_url").set({ value: webhook_url ?? "" });
  return NextResponse.json({ ok: true });
}
