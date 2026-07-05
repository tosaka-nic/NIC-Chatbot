"use client";
import { useState } from "react";
import CategoryBadge from "./CategoryBadge";
import ConfirmModal from "./ConfirmModal";
import { KBItem } from "@/lib/firestore";

const CATEGORIES = [
  "PC・ハードウェア",
  "ソフトウェア・アプリ",
  "ネットワーク",
  "アカウント・権限",
  "セキュリティ",
  "その他",
];

interface Props {
  item: KBItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

export default function KBCard({ item, isAdmin, onDelete }: Props) {
  const [votes, setVotes] = useState({ up: item.votes_up, down: item.votes_down });
  const [voting, setVoting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ question: item.question, answer: item.answer, category: item.category });
  const [current, setCurrent] = useState({ question: item.question, answer: item.answer, category: item.category });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

  async function vote(type: "up" | "down") {
    if (voting) return;
    setVoting(true);
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (res.ok) {
      const data = await res.json() as { votes_up: number; votes_down: number };
      setVotes({ up: data.votes_up, down: data.votes_down });
    }
    setVoting(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(item.id);
    }
    setShowConfirm(false);
  }

  function handleEditOpen() {
    setEditForm({ question: current.question, answer: current.answer, category: current.category });
    setEditError("");
    setIsEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json() as KBItem;
        setCurrent({ question: updated.question, answer: updated.answer, category: updated.category });
        setIsEditing(false);
      } else {
        const data = await res.json() as { error?: string };
        setEditError(data.error ?? "保存に失敗しました");
      }
    } catch {
      setEditError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="bg-white border border-blue-300 rounded-xl p-4 shadow-sm flex flex-col gap-3"
      >
        <select
          value={editForm.category}
          onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="text"
          value={editForm.question}
          onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="質問"
          required
        />
        <textarea
          value={editForm.answer}
          onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px] resize-y"
          placeholder="回答"
          required
        />
        {editError && <p className="text-xs text-red-500">{editError}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message={`「${current.question}」を削除しますか？\nこの操作は元に戻せません。`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge category={current.category} />
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handleEditOpen}
                className="text-gray-300 hover:text-blue-400 text-xs transition-colors"
                title="編集"
              >
                ✏
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-gray-300 hover:text-red-400 text-xs transition-colors"
                title="削除"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <p className="font-semibold text-gray-800 text-sm">{current.question}</p>
        <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{current.answer}</p>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <button
              onClick={() => vote("up")}
              disabled={voting}
              className="flex items-center gap-1 hover:text-green-500 transition-colors disabled:opacity-50"
            >
              👍 <span>{votes.up}</span>
            </button>
            <button
              onClick={() => vote("down")}
              disabled={voting}
              className="flex items-center gap-1 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              👎 <span>{votes.down}</span>
            </button>
          </div>
          <span>{item.added_by} · {item.created_at}</span>
        </div>
      </div>
    </>
  );
}
