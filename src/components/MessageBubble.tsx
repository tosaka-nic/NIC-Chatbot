export interface Message {
  role: "user" | "bot";
  text: string;
  source?: "n8n" | "kb" | "none";
}

const sourceBadge: Record<string, { label: string; cls: string }> = {
  kb: { label: "ナレッジより", cls: "bg-blue-100 text-blue-700" },
};

export default function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
            isUser
              ? "bg-blue-500 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
          }`}
        >
          {msg.text}
        </div>
        {msg.source && sourceBadge[msg.source] && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${sourceBadge[msg.source].cls}`}>
            {sourceBadge[msg.source].label}
          </span>
        )}
      </div>
    </div>
  );
}
