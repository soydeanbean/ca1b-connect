// src/pages/ai/AI.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfile } from "../../services/profileService";
import { aiCreateInstances, aiAskQuestion } from "../../services/aiService";
import { createSubjectActivity, getAllSubjects } from "../../services/subjectService";
import { createSubjectAnnouncement } from "../../services/subjectAnnouncementService";
import { createAnnouncement } from "../../services/announcementService";
import { canUseAI, incrementAIUsage, getAIUsageInfo } from "../../services/aiUsageService";
import type { AICreateResult, AIAnnouncementResult, AISubjectAnnouncementResult, AIError, AIUsageInfo } from "../../types/AI";
import type { UserProfile } from "../../types/Profile";
import "./AI.css";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function AI() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageInfo, setUsageInfo] = useState<AIUsageInfo | null>(null);

  // Input state
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"create" | "ask">("create");

  // Loading states
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Multi-instance results
  const [results, setResults] = useState<AICreateResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [subjectOverrides, setSubjectOverrides] = useState<Record<number, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Error
  const [error, setError] = useState<AIError | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const subjects = getAllSubjects().filter(s => s.code !== "ASSEMBLY" && s.code !== "EXAMEN");

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        const usage = await getAIUsageInfo(user.uid);
        setUsageInfo(usage);
      } catch (e) {
        console.error("Failed to init AI:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const refreshUsage = useCallback(async () => {
    if (!user) return;
    const usage = await getAIUsageInfo(user.uid);
    setUsageInfo(usage);
  }, [user]);

  const handleCreate = async () => {
    if (!input.trim()) { setMessage("Please enter a prompt."); return; }
    if (!user) return;

    const canUse = await canUseAI(user.uid);
    if (!canUse) {
      setMessage("❌ You have reached your free AI usage limit.");
      return;
    }

    setAnalyzing(true);
    setMessage("");
    setError(null);
    setShowPreview(false);
    setResults([]);
    setMode("create");

    try {
      const result = await aiCreateInstances(input.trim());
      await incrementAIUsage(user.uid);
      await refreshUsage();

      // Support both single and multi-instance results
      const resultArray = Array.isArray(result) ? result : [result];
      setResults(resultArray);
      setShowPreview(true);
    } catch (err) {
      const aiError = err as AIError;
      setError(aiError);
      setMessage(`❌ ${aiError.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAsk = async () => {
    if (!input.trim()) { setMessage("Please enter a question."); return; }
    if (!user) return;

    const canUse = await canUseAI(user.uid);
    if (!canUse) {
      setMessage("❌ You have reached your free AI usage limit.");
      return;
    }

    setAnalyzing(true);
    setMessage("");
    setError(null);
    setMode("ask");

    const question = input.trim();
    setChatHistory(prev => [...prev, { role: "user", content: question }]);
    setInput("");

    try {
      await incrementAIUsage(user.uid);
      await refreshUsage();
      const answer = await aiAskQuestion(question);
      setChatHistory(prev => [...prev, { role: "ai", content: answer }]);
    } catch (err) {
      const aiError = err as AIError;
      setError(aiError);
      setChatHistory(prev => [...prev, { role: "ai", content: `❌ ${aiError.message}` }]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");

    let saved = 0;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      try {
        if (result.type === "announcement") {
          await createAnnouncement(
            { title: result.title, content: result.content, category: result.category },
            profile
          );
          saved++;
        } else if (result.type === "subject_announcement") {
          const subjResult = result as AISubjectAnnouncementResult;
          await createSubjectAnnouncement(
            { title: subjResult.title, content: subjResult.content, pinned: subjResult.pinned, dueDate: subjResult.dueDate },
            subjResult.subjectCode,
            profile
          );
          saved++;
        } else {
          const subjectCode = subjectOverrides[i] || result.subjectCode;
          if (!subjectCode) { failed++; continue; }
          await createSubjectActivity(
            { title: result.title, description: result.description, type: result.type, dueDate: result.dueDate, dueTime: result.dueTime, link: "" },
            subjectCode,
            profile
          );
          saved++;
        }
      } catch (e) {
        console.error("Save failed for result", i, e);
        failed++;
      }
    }

    setSaving(false);
    setMessage(`✅ ${saved} item${saved !== 1 ? "s" : ""} saved${failed > 0 ? `, ${failed} failed` : ""}`);
    if (failed === 0) {
      setShowPreview(false);
      setResults([]);
      setInput("");
    }
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setInput("");
    setMode("create");
    setMessage("");
  };

  const formatResultPreview = (result: AICreateResult, index: number) => (
    <div key={index} className={`ai-preview-item ${selectedIndex === index ? "selected" : ""}`} onClick={() => setSelectedIndex(index)}>
      <div className="ai-preview-header">
        <span className={`ai-type-badge ${result.type}`}>
          {result.type === "announcement" ? "Announcement" : result.type === "subject_announcement" ? "Subject Announcement" : result.type}
        </span>
      </div>
      <h4>{result.title}</h4>
      {result.type !== "announcement" && result.type !== "subject_announcement" && (
        <div className="ai-preview-meta">
          <span className="ai-subject-tag">{result.subjectCode}</span>
          <span>Due: {result.dueDate || "N/A"}</span>
        </div>
      )}
      {result.type === "announcement" && (
        <p className="ai-preview-desc">{(result as AIAnnouncementResult).content.slice(0, 100)}...</p>
      )}
      {result.type === "subject_announcement" && (
        <p className="ai-preview-desc">{(result as AISubjectAnnouncementResult).content.slice(0, 100)}...</p>
      )}
      <div className="ai-preview-actions-row">
        {result.type !== "announcement" && result.type !== "subject_announcement" && (
          <select
            value={subjectOverrides[index] || result.subjectCode || ""}
            onChange={e => setSubjectOverrides(prev => ({ ...prev, [index]: e.target.value }))}
            onClick={e => e.stopPropagation()}
            className="ai-subject-select"
          >
            <option value="">Select subject</option>
            {subjects.map(s => (
              <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="ai-page"><div className="ai-loading">Loading AI...</div></div>;
  }

  return (
    <div className="ai-page">
      <div className="ai-header">
        <div>
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>AI Assistant</h1>
          <p>Use AI to create activities, announcements, or ask questions about your class.</p>
        </div>
      </div>

      {/* Usage bar */}
      {usageInfo && (
        <div className="ai-usage-bar">
          <div className="ai-usage-info">
            <span>🤖 AI Usage</span>
            <span>{usageInfo.used}/{usageInfo.limit} today</span>
          </div>
          <div className="ai-usage-track">
            <div className="ai-usage-fill" style={{ width: `${Math.min(100, (usageInfo.used / usageInfo.limit) * 100)}%` }} />
          </div>
          {usageInfo.isLimited && (
            <div className="ai-usage-limit-msg">You have reached your free AI usage limit. Reset at midnight.</div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className={`ai-error-banner ${error.type}`}>
          <span>{error.type === "safety" ? "⚠️" : error.type === "quota" ? "🔄" : error.type === "network" ? "🔌" : "❌"}</span>
          <span>{error.message}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {message && (
        <div className={`ai-message ${message.startsWith("✅") ? "success" : "error"}`}>{message}</div>
      )}

      {/* Input */}
      <div className="ai-input-section">
        <div className="ai-input-container">
          <textarea
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              mode === "ask"
                ? "Ask any question about your subjects, schedule, or class..."
                : 'Describe what you want to create. Example: "Create announcements for Math quiz tomorrow and Science lab on Friday"'
            }
            rows={4}
            disabled={analyzing}
          />
          <div className="ai-input-actions">
            <div className="ai-buttons">
              <button className="ai-btn create-btn" onClick={handleCreate} disabled={analyzing || !input.trim() || usageInfo?.isLimited}>
                {analyzing && mode === "create" ? <><span className="ai-spinner" /> Creating...</> : "🧠 Create"}
              </button>
              <button className="ai-btn ask-btn" onClick={handleAsk} disabled={analyzing || !input.trim() || usageInfo?.isLimited}>
                {analyzing && mode === "ask" ? <><span className="ai-spinner" /> Thinking...</> : "🤖 Ask"}
              </button>
            </div>
            <span className="ai-char-count">{input.length}/5000</span>
          </div>
        </div>
      </div>

      {/* Multi-instance Preview */}
      {showPreview && results.length > 0 && (
        <div className="ai-preview-panel">
          <div className="ai-preview-panel-header">
            <h2>📋 AI Generated Items ({results.length})</h2>
            <p>Review and confirm before saving. Select a subject for each activity.</p>
          </div>

          <div className="ai-preview-list">
            {results.map((result, i) => formatResultPreview(result, i))}
          </div>

          <div className="ai-preview-actions">
            <button className="ai-btn cancel-btn" onClick={() => { setShowPreview(false); setResults([]); }}>
              Cancel All
            </button>
            <button className="ai-btn confirm-btn" onClick={handleSaveAll} disabled={saving}>
              {saving ? "Saving..." : `✅ Save All (${results.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Chat Display */}
      {mode === "ask" && chatHistory.length > 0 && (
        <div className="ai-chat-section">
          <div className="ai-chat-header">
            <h2>💬 Q&A</h2>
            <button className="ai-btn new-chat-btn" onClick={handleNewChat}>+ New Chat</button>
          </div>
          <div className="ai-chat-messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`ai-chat-message ${msg.role}`}>
                <div className="ai-chat-avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
                <div className="ai-chat-bubble">
                  <div className="ai-chat-sender">{msg.role === "user" ? "You" : "AI Assistant"}</div>
                  <div className="ai-chat-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Usage limit info */}
      {usageInfo?.isLimited && (
        <div className="ai-limit-card">
          <h3>🔋 Usage Limit Reached</h3>
          <p>You have used all {usageInfo.limit} AI requests for today. Your limit will reset at midnight.</p>
          <p className="ai-limit-note">Future updates may include premium plans with higher limits.</p>
        </div>
      )}
    </div>
  );
}