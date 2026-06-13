// src/components/common/AiAssistant.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendAiMessage,
  buildContext,
  clearAiHistory
} from "../../services/aiService";
import "./AiAssistant.css";

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Init position: bottom-right
  useEffect(() => {
    setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
    setVisible(true);
  }, []);

  // Click outside closes with animate-out
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    // Delay to avoid immediate close on toggle
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = async () => {
    setOpen(true);
    setMessages([{ role: "ai", text: "Hello! I'm the CA1B assistant. Ask me about assignments, events, schedules, or anything else." }]);
    // Build context in the background
    buildContext().catch(() => {});
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const reply = await sendAiMessage(userMsg);
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I had trouble connecting." }
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearAiHistory();
    setMessages([]);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: posStart.current.x + dx,
        y: posStart.current.y + dy
      });
    };

    const handleUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, position]);

  if (!visible) return null;

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className="ai-fab"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        onClick={() => !dragging && (open ? handleClose() : handleOpen())}
        aria-label="AI Assistant"
      >
        <span className="ai-fab-icon">🤖</span>
      </button>

      {/* Chat modal */}
      {open && (
        <div
          className={`ai-modal ${open ? "ai-modal-enter" : "ai-modal-exit"}`}
          ref={modalRef}
        >
          <div className="ai-modal-header">
            <h3>CA1B Assistant</h3>
            <div className="ai-header-actions">
              <button
                type="button"
                className="ai-header-btn"
                onClick={handleClear}
                title="Clear history"
              >
                🗑️
              </button>
              <button
                type="button"
                className="ai-header-btn"
                onClick={handleClose}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="ai-modal-body">
            {messages.length === 0 && (
              <div className="ai-empty">
                Ask me about your class activities, events, or schedule.
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ${msg.role}`}>
                <div className="ai-msg-bubble">{msg.text}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai">
                <div className="ai-msg-bubble ai-typing">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-modal-footer">
            <textarea
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about assignments, events..."
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              className="ai-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}