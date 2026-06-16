import { useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import type { ChatMessage } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface UseAIOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  onStreamToken?: (token: string) => void;
}

interface UseAIReturn {
  messages: ChatMessage[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<string>;
  sendMessageStreaming: (content: string) => Promise<string>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearMessages: () => void;
  saveConversation: (title?: string, contextType?: string) => Promise<string | null>;
  loadConversation: (id: string) => Promise<void>;
}

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const {
    systemPrompt,
    model = 'zhipuai/glm-4-5',
    temperature = 0.3,
    maxTokens = 2048,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getAuthToken = async () => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return token;
  };

  const buildApiMessages = (allMsgs: ChatMessage[]) => {
    const apiMessages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of allMsgs) {
      if (m.role !== 'system') {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }
    return apiMessages;
  };

  const sendMessage = useCallback(
    async (content: string): Promise<string> => {
      setError(null);
      setLoading(true);

      const userMsg: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);

      try {
        const token = await getAuthToken();
        const allMsgs = [...messages, userMsg];
        const apiMessages = buildApiMessages(allMsgs);

        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            model,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `AI request failed (${res.status})`);
        }

        const data = await res.json();
        const assistantContent = data.choices?.[0]?.message?.content || 'No response generated.';

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        return assistantContent;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get AI response';
        setError(msg);
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: `I encountered an error: ${msg}. Please check that the OpenRouter API key is configured and try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return errorMsg.content;
      } finally {
        setLoading(false);
      }
    },
    [messages, systemPrompt, model, temperature, maxTokens]
  );

  const sendMessageStreaming = useCallback(
    async (content: string): Promise<string> => {
      setError(null);
      setLoading(true);
      setStreaming(true);

      const userMsg: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);

      const placeholderMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      let accumulated = '';

      try {
        const token = await getAuthToken();
        const allMsgs = [...messages, userMsg];
        const apiMessages = buildApiMessages(allMsgs);

        abortRef.current = new AbortController();

        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            model,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `AI request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                accumulated += token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulated,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        if (!accumulated) {
          accumulated = 'No response generated.';
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
            return updated;
          });
        }

        return accumulated;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return accumulated || 'Response cancelled.';
        }
        const msg = err instanceof Error ? err.message : 'Failed to get AI response';
        setError(msg);
        const errorContent = `I encountered an error: ${msg}. Please check that the OpenRouter API key is configured and try again.`;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: errorContent };
          return updated;
        });
        return errorContent;
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, systemPrompt, model, temperature, maxTokens]
  );

  const saveConversation = useCallback(
    async (title?: string, contextType: string = 'general'): Promise<string | null> => {
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId || messages.length === 0) return null;

        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        const orgId = orgs?.[0]?.id;
        if (!orgId) return null;

        const autoTitle = title || messages[0]?.content.slice(0, 60) || 'New conversation';

        const { data, error: err } = await supabase.from('ai_conversations').insert({
          org_id: orgId,
          user_id: userId,
          context_type: contextType,
          title: autoTitle,
          messages: messages,
        }).select('id').single();

        if (err) throw err;
        return data?.id || null;
      } catch {
        return null;
      }
    },
    [messages]
  );

  const loadConversation = useCallback(async (id: string) => {
    const { data } = await supabase.from('ai_conversations').select('messages').eq('id', id).single();
    if (data?.messages) {
      setMessages(data.messages as ChatMessage[]);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { messages, loading, streaming, error, sendMessage, sendMessageStreaming, setMessages, clearMessages, saveConversation, loadConversation };
}

export function buildComplianceSystemPrompt(context: {
  totalControls: number;
  passingControls: number;
  failingControls: number;
  complianceScore: number;
  frameworks: string[];
  failingControlsList?: string[];
}): string {
  return `You are Stakflo AI, an expert compliance and security assistant built into the Stakflo platform. You help compliance teams stay audit-ready.

Current compliance posture:
- Total controls: ${context.totalControls}
- Passing: ${context.passingControls}
- Failing: ${context.failingControls}
- Compliance score: ${context.complianceScore}%
- Active frameworks: ${context.frameworks.join(', ')}
${context.failingControlsList?.length ? `- Failing controls: ${context.failingControlsList.join('; ')}` : ''}

Guidelines:
- Give specific, actionable compliance advice
- Reference specific controls and frameworks when relevant
- Prioritize by risk level (critical > high > medium > low)
- Suggest evidence types that would satisfy auditors
- Be concise but thorough
- Format responses with markdown when helpful
- Always consider SOC 2, ISO 27001, HIPAA, and GDPR perspectives`;
}
