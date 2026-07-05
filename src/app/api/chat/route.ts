import { NextRequest, NextResponse } from "next/server";
import { db, KBItem } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  const { question } = await req.json() as { question: string };

  if (!question?.trim()) {
    return NextResponse.json({ error: "question は必須です" }, { status: 400 });
  }

  // 1. ナレッジベースをまず検索
  const snapshot = await db.collection("items").get();
  const items = snapshot.docs.map(d => d.data() as KBItem);
  const words = question.trim().toLowerCase().split(/\s+/);

  const matched = items
    .filter(item =>
      words.every(w =>
        item.question.toLowerCase().includes(w) ||
        item.answer.toLowerCase().includes(w)
      )
    )
    .sort((a, b) => b.votes_up - a.votes_up);

  if (matched.length > 0) {
    return NextResponse.json({ answer: matched[0].answer, source: "kb", item: matched[0] });
  }

  // 2. n8n (GPT-4o-mini) にフォールバック
  const settingDoc = await db.collection("settings").doc("webhook_url").get();
  const webhookUrl = settingDoc.data()?.value?.trim();

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.answer ?? data.text ?? data.response ?? data.message ?? null;
        if (answer) return NextResponse.json({ answer, source: "n8n" });
      }
    } catch { /* タイムアウト */ }
  }

  return NextResponse.json({
    answer: "申し訳ありません、その質問への回答が見つかりませんでした。SEに直接お問い合わせください。",
    source: "none",
  });
}
