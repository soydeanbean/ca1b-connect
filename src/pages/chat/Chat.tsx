// src/pages/chat/Chat.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfile, getClassProfiles } from "../../services/profileService";
import {
  ensureGroupThread,
  ensurePrivateThread,
  sendMessage,
  togglePinMessage,
  deleteMessage,
  subscribeToMessages,
  subscribeToPinnedMessages
} from "../../services/chatService";
import type { ChatMessage } from "../../types/Chat";
import type { UserProfile } from "../../types/Profile";
import { subscribeToAllPresence } from "../../services/presenceService";
import "./Chat.css";

type ViewState = "threads" | "chat";

export default function Chat() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinned, setPinned] = useState<ChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState("General Chat");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("threads");
  const [showPinned, setShowPinned] = useState(false);
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load profile and students
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const [p, s] = await Promise.all([
          getUserProfile(user.uid),
          getClassProfiles()
        ]);
        setProfile(p);
        setStudents(s);
      } catch (err) {
        console.error("Chat init failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Subscribe to presence
  useEffect(() => {
    if (students.length === 0) return;
    const allUids = students.map((s) => s.uid);
    const unsub = subscribeToAllPresence(allUids, setPresence);
    return unsub;
  }, [students]);

  // Open group chat
  const openGroupChat = useCallback(async () => {
    const threadId = await ensureGroupThread();
    setActiveThreadId(threadId);
    setActiveThreadTitle("General Chat");
    setView("chat");
  }, []);

  // Open private chat
  const openPrivateChat = useCallback(async (other: UserProfile) => {
    if (!user) return;
    const threadId = await ensurePrivateThread(user.uid, other);
    setActiveThreadId(threadId);
    setActiveThreadTitle(other.name);
    setView("chat");
  }, [user]);

  // Subscribe to messages
  useEffect(() => {
    if (!activeThreadId) return;

    const unsubMsg = subscribeToMessages(activeThreadId, (msgs) => {
      setMessages(msgs);
    });

    const unsubPin = subscribeToPinnedMessages(activeThreadId, (pinnedMsgs) => {
      setPinned(pinnedMsgs);
    });

    return () => {
      unsubMsg();
      unsubPin();
    };
  }, [activeThreadId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!profile || !activeThreadId || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(activeThreadId, profile, text);
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePinToggle = async (msg: ChatMessage) => {
    try {
      await togglePinMessage(msg.id, msg.pinned);
    } catch (err) {
      console.error("Pin toggle failed:", err);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteMessage(msgId);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) {
    return <div className="chat-page">Loading chat...</div>;
  }

  const otherStudents = students.filter((s) => s.uid !== user?.uid);

  // ─── Thread List View ────────────────────────────

  if (view === "threads") {
    return (
      <div className="chat-page">
        <section className="chat-hero">
          <div>
            <span className="chat-eyebrow">Messaging</span>
            <h1>Chat</h1>
            <p>Group chat with the class, or message a student privately.</p>
          </div>
        </section>

        <section className="chat-thread-list">
          <button
            type="button"
            className="chat-thread-card group"
            onClick={openGroupChat}
          >
            <div className="chat-thread-avatar">💬</div>
            <div className="chat-thread-info">
              <strong>General Chat</strong>
              <span>Entire class group</span>
            </div>
          </button>

          <h3 className="chat-section-label">Students</h3>

          {otherStudents.map((student) => (
            <button
              key={student.uid}
              type="button"
              className="chat-thread-card"
              onClick={() => openPrivateChat(student)}
            >
              <div className="chat-thread-avatar">
                <img src={student.photoURL || "/default-avatar.png"} alt="" />
              </div>
            <div className="chat-thread-info">
                <div className="chat-thread-name-row">
                  <strong>{student.name}</strong>
                  <span className={`chat-online-dot ${presence.get(student.uid) ? "online" : "offline"}`} />
                </div>
                <span>{student.email}</span>
              </div>
            </button>
          ))}
        </section>
      </div>
    );
  }

  // ─── Chat View ───────────────────────────────────

  return (
    <div className="chat-page chat-active">
      <div className="chat-header">
        <button
          type="button"
          className="chat-back-btn"
          onClick={() => {
            setActiveThreadId(null);
            setView("threads");
          }}
        >
          ← Back
        </button>

        <h2>{activeThreadTitle}</h2>

        {pinned.length > 0 && (
          <button
            type="button"
            className="chat-pinned-toggle"
            onClick={() => setShowPinned(!showPinned)}
          >
            📌 {pinned.length}
          </button>
        )}
      </div>

      {/* Pinned messages */}
      {showPinned && pinned.length > 0 && (
        <div className="chat-pinned-bar">
          {pinned.map((msg) => (
            <div key={msg.id} className="chat-pinned-msg">
              <span className="chat-pinned-icon">📌</span>
              <strong>{msg.senderName}:</strong> {msg.text}
              <button
                type="button"
                className="chat-unpin-btn"
                onClick={() => handlePinToggle(msg)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderUid === user?.uid;
            return (
              <div
                key={msg.id}
                className={`chat-msg ${isOwn ? "own" : ""} ${msg.pinned ? "pinned" : ""}`}
              >
                {!isOwn && (
                  <img
                    className="chat-msg-avatar"
                    src={msg.senderPhotoURL || "/default-avatar.png"}
                    alt=""
                  />
                )}

                <div className="chat-msg-bubble">
                  {!isOwn && (
                    <div className="chat-msg-sender">{msg.senderName}</div>
                  )}
                  <div className="chat-msg-text">{msg.text}</div>
                  <div className="chat-msg-actions">
                    <button
                      type="button"
                      className={`chat-action-btn ${msg.pinned ? "active" : ""}`}
                      onClick={() => handlePinToggle(msg)}
                      title={msg.pinned ? "Unpin" : "Pin"}
                    >
                      📌
                    </button>
                    {isOwn && (
                      <button
                        type="button"
                        className="chat-action-btn"
                        onClick={() => handleDelete(msg.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          rows={1}
          disabled={sending}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={sending || !text.trim()}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}