"use client";
import { useState, useRef, useEffect } from "react";
import MessageBubble, { Message } from "./MessageBubble";

const GREETING: Message = {
  role: "bot",
  text: "こんにちは！ITサポートBotです。\nPC・ネットワーク・アプリのお困りごとをお気軽にどうぞ。",
};

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function groupByDate(messages: (Message & { timestamp?: string })[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString("ja-JP") : "";
    const last = groups[groups.length - 1];
    if (!last || last.date !== date) {
      groups.push({ date, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  }
  return groups;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [historyGroups, setHistoryGroups] = useState<{ date: string; messages: Message[] }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat/history")
      .then(r => r.json())
      .then((data: (Message & { timestamp?: string })[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistoryGroups(groupByDate(data));
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json() as { answer: string; source: "n8n" | "kb" | "none" };
      setMessages(prev => [...prev, { role: "bot", text: data.answer, source: data.source }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "エラーが発生しました。しばらくしてから再試行してください。", source: "none" }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <MessageBubble msg={GREETING} />
          {!historyLoading && historyGroups.length > 0 && (
            <>
              <DateSeparator label="── 過去7日間の履歴 ──" />
              {historyGroups.map(group => (
                <div key={group.date}>
                  <DateSeparator label={group.date} />
                  {group.messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                </div>
              ))}
              <DateSeparator label="── 現在 ──" />
            </>
          )}
          {messages.slice(1).map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力してください… (Enter送信 / Shift+Enter改行)"
            rows={1}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 max-h-32 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="shrink-0 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </div>
      </div>
    </>
  );
}
