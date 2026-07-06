import { NextRequest, NextResponse } from "next/server";
import { db, KBItem } from "@/lib/firestore";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

async function saveMessages(userId: string, userText: string, botText: string, source: string) {
  try {
    const now = new Date().toISOString();
    const col = db.collection("chatHistory").doc(userId).collection("messages");
    await Promise.all([
      col.doc(randomUUID()).set({ role: "user", text: userText, timestamp: now }),
      col.doc(randomUUID()).set({ role: "bot", text: botText, source, timestamp: now }),
    ]);
  } catch { /* 保存失敗しても回答は返す */ }
}

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

  const session = await getSession();
  const userId = session?.sub ?? "anonymous";

  if (matched.length > 0) {
    const answer = matched[0].answer;
    await saveMessages(userId, question, answer, "kb");
    return NextResponse.json({ answer, source: "kb", item: matched[0] });
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
        if (answer) {
          await saveMessages(userId, question, answer, "n8n");
          return NextResponse.json({ answer, source: "n8n" });
        }
      }
    } catch { /* タイムアウト */ }
  }

  const answer = "申し訳ありません、その質問への回答が見つかりませんでした。SEに直接お問い合わせください。";
  await saveMessages(userId, question, answer, "none");
  return NextResponse.json({ answer, source: "none" });
}
