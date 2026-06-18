// // src/pages/ai/AI.tsx

// import { useState, useRef, useEffect } from "react";
// import { useAuth } from "../../hooks/useAuth";
// import { getUserProfile } from "../../services/profileService";
// import { aiCreateInstances, aiAskQuestion } from "../../services/aiService";
// import { createSubjectActivity } from "../../services/subjectService";
// import { createAnnouncement } from "../../services/announcementService";
// import { getAllSubjects } from "../../services/subjectService";
// import type { AICreateResult, AIAssignmentResult, AIAnnouncementResult, AIError } from "../../types/AI";
// import type { UserProfile } from "../../types/Profile";
// import "./AI.css";


// type AIMode = "create" | "ask" | null;

// interface ChatMessage {
//   role: "user" | "ai";
//   content: string;
// }

export default function AI() {
  return <div>Fixing...</div>;
}

// export default function AI() {
//   const { user } = useAuth();
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [loading, setLoading] = useState(true);

//   // Input state
//   const [input, setInput] = useState("");
//   const [activeMode, setActiveMode] = useState<AIMode>(null);

//   // Loading states
//   const [analyzing, setAnalyzing] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState("");

//   // Create Instances state
//   const [aiResult, setAiResult] = useState<AICreateResult | null>(null);
//   const [showPreview, setShowPreview] = useState(false);
//   const [selectedSubjectCode, setSelectedSubjectCode] = useState("");

//   // Ask Question state
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

//   // Error state
//   const [error, setError] = useState<AIError | null>(null);

//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const subjects = getAllSubjects();

//   useEffect(() => {
//     const init = async () => {
//       if (!user) return;
//       try {
//         const p = await getUserProfile(user.uid);
//         setProfile(p);
//       } catch (e) {
//         console.error("Failed to load profile:", e);
//       } finally {
//         setLoading(false);
//       }
//     };
//     init();
//   }, [user]);

//   // Auto-scroll chat
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatHistory]);

//   const handleCreateInstances = async () => {
//     if (!input.trim()) {
//       setMessage("Please enter a prompt first.");
//       return;
//     }

//     setAnalyzing(true);
//     setMessage("");
//     setError(null);
//     setAiResult(null);
//     setShowPreview(false);
//     setActiveMode("create");

//     try {
//       const result = await aiCreateInstances(input.trim());
//       setAiResult(result);
//       setShowPreview(true);
      
//       // Pre-select subject if AI identified one
//       if (result.type !== "announcement" && result.subjectCode) {
//         setSelectedSubjectCode(result.subjectCode);
//       }
//     } catch (err) {
//       const aiError = err as AIError;
//       setError(aiError);
//       setMessage(`❌ ${aiError.message}`);
//     } finally {
//       setAnalyzing(false);
//     }
//   };

//   const handleAskQuestion = async () => {
//     if (!input.trim()) {
//       setMessage("Please enter a question first.");
//       return;
//     }

//     setAnalyzing(true);
//     setMessage("");
//     setError(null);
//     setActiveMode("ask");

//     const question = input.trim();

//     // Add user message to chat
//     setChatHistory(prev => [...prev, { role: "user", content: question }]);
//     setInput("");

//     try {
//       const answer = await aiAskQuestion(question);
//       setChatHistory(prev => [...prev, { role: "ai", content: answer }]);
//     } catch (err) {
//       const aiError = err as AIError;
//       setError(aiError);
//       setChatHistory(prev => [...prev, { role: "ai", content: `❌ ${aiError.message}` }]);
//     } finally {
//       setAnalyzing(false);
//     }
//   };

//   const handleConfirmSave = async () => {
//     if (!profile || !aiResult) return;

//     setSaving(true);
//     setMessage("");

//     try {
//       if (aiResult.type === "announcement") {
//         // Save as announcement
//         await createAnnouncement(
//           {
//             title: aiResult.title,
//             content: aiResult.content,
//             category: aiResult.category,
//           },
//           profile
//         );
//         setMessage("✅ Announcement created successfully!");
//       } else {
//         // Save as subject activity with potentially corrected subject
//         const subjectCode = selectedSubjectCode || aiResult.subjectCode;
//         if (!subjectCode) {
//           setMessage("❌ Please select a subject before saving.");
//           setSaving(false);
//           return;
//         }

//         await createSubjectActivity(
//           {
//             title: aiResult.title,
//             description: aiResult.description,
//             type: aiResult.type,
//             dueDate: aiResult.dueDate || "",
//             dueTime: aiResult.dueTime || "",
//             link: "",
//           },
//           subjectCode,
//           profile
//         );
//         setMessage(`✅ ${capitalizeType(aiResult.type)} created for ${subjectCode}!`);
//       }

//       // Reset after successful save
//       setShowPreview(false);
//       setAiResult(null);
//       setInput("");
//     } catch (err) {
//       console.error("Save failed:", err);
//       setMessage("❌ Failed to save. Please try manually.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleCancelPreview = () => {
//     setShowPreview(false);
//     setAiResult(null);
//     setError(null);
//     setMessage("");
//   };

//   const handleNewChat = () => {
//     setChatHistory([]);
//     setInput("");
//     setActiveMode(null);
//     setMessage("");
//   };

//   const capitalizeType = (type: string) => {
//     return type.charAt(0).toUpperCase() + type.slice(1);
//   };

//   if (loading) {
//     return <div className="ai-page"><div className="ai-loading">Loading AI...</div></div>;
//   }

//   const isAssignmentType = aiResult && aiResult.type !== "announcement";
//   const assignmentResult = isAssignmentType ? (aiResult as AIAssignmentResult) : null;
//   const announcementResult = !isAssignmentType && aiResult ? (aiResult as AIAnnouncementResult) : null;

//   return (
//     <div className="ai-page">
//       <div className="ai-header">
//         <div>
//           <span className="ai-eyebrow">CA1B Connect</span>
//           <h1>AI Assistant</h1>
//           <p>Use AI to create activities, assignments, announcements, or ask questions.</p>
//         </div>
//       </div>

//       {/* Error banner */}
//       {error && error.type !== "unknown" && (
//         <div className={`ai-error-banner ${error.type}`}>
//           <span className="ai-error-icon">
//             {error.type === "safety" ? "⚠️" : error.type === "quota" ? "🔄" : error.type === "network" ? "🔌" : "❌"}
//           </span>
//           <span>{error.message}</span>
//           <button onClick={() => setError(null)} className="ai-error-dismiss">✕</button>
//         </div>
//       )}

//       {message && <div className={`ai-message ${message.startsWith("✅") ? "success" : message.startsWith("❌") ? "error" : ""}`}>{message}</div>}

//       {/* Input Section */}
//       <div className="ai-input-section">
//         <div className="ai-input-container">
//           <textarea
//             className="ai-input"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder={
//               activeMode === "ask"
//                 ? "Ask any question about your subjects, schedule, or class..."
//                 : "Paste an announcement, assignment, or activity description to analyze..."
//             }
//             rows={4}
//             disabled={analyzing}
//           />
//           <div className="ai-input-actions">
//             <div className="ai-buttons">
//               <button
//                 className="ai-btn create-btn"
//                 onClick={handleCreateInstances}
//                 disabled={analyzing || !input.trim()}
//               >
//                 {analyzing && activeMode === "create" ? (
//                   <><span className="ai-spinner" /> Analyzing...</>
//                 ) : (
//                   "🧠 Create Instances"
//                 )}
//               </button>
//               <button
//                 className="ai-btn ask-btn"
//                 onClick={handleAskQuestion}
//                 disabled={analyzing || !input.trim()}
//               >
//                 {analyzing && activeMode === "ask" ? (
//                   <><span className="ai-spinner" /> Thinking...</>
//                 ) : (
//                   "🤖 Ask Question"
//                 )}
//               </button>
//             </div>
//             <span className="ai-char-count">{input.length}/5000</span>
//           </div>
//         </div>
//       </div>

//       {/* Create Instances - Preview Panel */}
//       {showPreview && aiResult && (
//         <div className="ai-preview-panel">
//           <div className="ai-preview-header">
//             <h2>
//               {aiResult.type === "announcement" ? "📢 Announcement Preview" : `📝 ${capitalizeType(aiResult.type)} Preview`}
//             </h2>
//             <span className={`ai-preview-badge ${aiResult.type === "announcement" ? announcementResult?.category : aiResult.type}`}>
//               {aiResult.type === "announcement" 
//                 ? `${capitalizeType(announcementResult?.category || "minor")} Announcement`
//                 : capitalizeType(aiResult.type)}
//             </span>
//           </div>

//           <div className="ai-preview-body">
//             {/* Fields that apply to both */}
//             <div className="ai-preview-field">
//               <label>Title</label>
//               <p>{aiResult.title}</p>
//             </div>

//             {/* Assignment/Activity/Project fields */}
//             {assignmentResult && (
//               <>
//                 <div className="ai-preview-field">
//                   <label>Subject</label>
//                   <select
//                     value={selectedSubjectCode || assignmentResult.subjectCode}
//                     onChange={(e) => setSelectedSubjectCode(e.target.value)}
//                     className="ai-subject-select"
//                   >
//                     <option value="">-- Select Subject --</option>
//                     {subjects.map((s) => (
//                       <option key={s.code} value={s.code}>
//                         {s.code} - {s.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="ai-preview-field">
//                   <label>Description</label>
//                   <p>{assignmentResult.description || "No description."}</p>
//                 </div>
//                 <div className="ai-preview-row">
//                   <div className="ai-preview-field">
//                     <label>Due Date</label>
//                     <p>{assignmentResult.dueDate || "Not specified"}</p>
//                   </div>
//                   <div className="ai-preview-field">
//                     <label>Due Time</label>
//                     <p>{assignmentResult.dueTime || "Not specified"}</p>
//                   </div>
//                 </div>
//               </>
//             )}

//             {/* Announcement fields */}
//             {announcementResult && (
//               <>
//                 <div className="ai-preview-field">
//                   <label>Content</label>
//                   <p className="ai-preview-content">{announcementResult.content}</p>
//                 </div>
//                 <div className="ai-preview-row">
//                   <div className="ai-preview-field">
//                     <label>Category</label>
//                     <p>
//                       <span className={`ai-category-badge ${announcementResult.category}`}>
//                         {capitalizeType(announcementResult.category)}
//                       </span>
//                     </p>
//                   </div>
//                   <div className="ai-preview-field">
//                     <label>Urgency</label>
//                     <p>
//                       <span className={`ai-urgency-badge ${announcementResult.urgency}`}>
//                         {capitalizeType(announcementResult.urgency)}
//                       </span>
//                     </p>
//                   </div>
//                 </div>
//                 {announcementResult.targetSubjectCode && (
//                   <div className="ai-preview-field">
//                     <label>Target Subject</label>
//                     <p>{announcementResult.targetSubjectCode} - {announcementResult.targetSubjectName}</p>
//                   </div>
//                 )}
//               </>
//             )}
//           </div>

//           <div className="ai-preview-actions">
//             <button
//               className="ai-btn cancel-btn"
//               onClick={handleCancelPreview}
//               disabled={saving}
//             >
//               Cancel
//             </button>
//             <button
//               className="ai-btn confirm-btn"
//               onClick={handleConfirmSave}
//               disabled={saving || (!!assignmentResult && !selectedSubjectCode && !assignmentResult.subjectCode)}
//             >
//               {saving ? "Saving..." : `✅ Confirm & Save${assignmentResult ? ` to ${selectedSubjectCode || "Subject"}` : ""}`}
//             </button>
//           </div>

//           {assignmentResult && !selectedSubjectCode && !assignmentResult.subjectCode && (
//             <p className="ai-preview-warning">⚠️ Please select a subject to save this activity.</p>
//           )}
//         </div>
//       )}

//       {/* Ask Question - Chat Display */}
//       {activeMode === "ask" && chatHistory.length > 0 && (
//         <div className="ai-chat-section">
//           <div className="ai-chat-header">
//             <h2>💬 Q&A</h2>
//             <button className="ai-btn new-chat-btn" onClick={handleNewChat}>
//               + New Chat
//             </button>
//           </div>
//           <div className="ai-chat-messages">
//             {chatHistory.map((msg, index) => (
//               <div key={index} className={`ai-chat-message ${msg.role}`}>
//                 <div className="ai-chat-avatar">
//                   {msg.role === "user" ? "👤" : "🤖"}
//                 </div>
//                 <div className="ai-chat-bubble">
//                   <div className="ai-chat-sender">
//                     {msg.role === "user" ? "You" : "AI Assistant"}
//                   </div>
//                   <div className="ai-chat-text">{msg.content}</div>
//                 </div>
//               </div>
//             ))}
//             <div ref={chatEndRef} />
//           </div>
//         </div>
//       )}

//       {/* Fallback: Manual entry suggestion */}
//       {error && error.type === "parse" && (
//         <div className="ai-fallback-section">
//           <h3>✏️ Manual Entry</h3>
//           <p>The AI couldn't parse your input. You can create entries manually:</p>
//           <div className="ai-fallback-links">
//             <a href="/announcements" className="ai-fallback-btn">Go to Announcements</a>
//             <a href="/subjects" className="ai-fallback-btn">Go to Subjects</a>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }