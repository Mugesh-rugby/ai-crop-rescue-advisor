"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Globe, AlertCircle, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState("EN GB");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const chatHistory = [...messages, userMessage];

    setMessages(chatHistory);
    setInput("");
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to communicate with AI.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to connect to local Ollama server. Verify it is running with gemma3:1b model."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[#dceed5] bg-white shadow-2xl transition-all duration-300 sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#f4f9f2] border-b border-[#e2edd8] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4c8a38] text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#1e331b]">CropRescue AI</h3>
                <p className="text-[10px] font-semibold text-[#556655]">
                  • Powered by Ollama
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-[#c8dfbf] bg-white px-2 py-1 text-xs font-bold text-[#396c2a]">
                <Globe className="h-3 w-3" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent font-bold outline-none cursor-pointer"
                  aria-label="Select Language"
                >
                  <option value="EN GB">EN GB</option>
                  <option value="ES ES">ES ES</option>
                  <option value="HI IN">HI IN</option>
                </select>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[#556655] hover:bg-[#eef6eb] hover:text-[#396c2a]"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fafcf9]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e3f4db] text-[#4c8a38] mb-3">
                  <Bot className="h-6 w-6 animate-pulse" />
                </span>
                <h4 className="text-sm font-bold text-[#1e331b]">Welcome to CropRescue AI!</h4>
                <p className="text-xs text-[#556655] mt-1">
                  Ask me any questions about crop health, diseases, soil, irrigation, or weather recommendations.
                </p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef6eb] text-[#4c8a38]">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm max-w-[75%] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#eef6eb] text-[#1e331b] font-medium rounded-tr-none"
                      : "bg-white border border-[#e2edd8] text-[#2d402b] rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4c8a38] text-xs font-bold text-white uppercase">
                    M
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef6eb] text-[#4c8a38]">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-[#e2edd8] px-4 py-2.5 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[#4c8a38]" />
                  <span className="text-xs text-[#556655]">Thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 leading-normal">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="font-bold">Ollama Assistant Unreachable</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="border-t border-[#e2edd8] bg-white p-3">
            <div className="flex items-center gap-2 rounded-full border border-[#c8dfbf] bg-[#fafcf9] px-4 py-1.5 focus-within:border-[#4c8a38] focus-within:bg-white transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about crops, diseases, irrigation..."
                className="flex-1 bg-transparent text-sm text-[#1e331b] outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4c8a38] text-white hover:bg-[#396c2a] disabled:opacity-40 transition-colors"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4c8a38] text-white shadow-xl hover:bg-[#396c2a] transition-all transform hover:scale-105 active:scale-95"
        aria-label="Toggle chat advisor"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
