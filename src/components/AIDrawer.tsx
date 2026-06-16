import { useState, useRef, useEffect, useCallback } from 'react';
import Drawer from '@cloudscape-design/components/drawer';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import ButtonGroup from '@cloudscape-design/components/button-group';
import LiveRegion from '@cloudscape-design/components/live-region';
import Button from '@cloudscape-design/components/button';
import PromptInput from '@cloudscape-design/components/prompt-input';
import Select from '@cloudscape-design/components/select';
import Tabs from '@cloudscape-design/components/tabs';
import Badge from '@cloudscape-design/components/badge';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import SupportPromptGroup from '@cloudscape-design/chat-components/support-prompt-group';
import { useAI, buildComplianceSystemPrompt } from '../lib/useAI';
import { supabase } from '../lib/supabase';
import MarkdownContent from './MarkdownContent';
import type { Control, Framework, AIConversation } from '../lib/types';

const AI_MODELS = [
  { label: 'GLM-4 (Fast)', value: 'zhipuai/glm-4-5' },
  { label: 'Llama 3.1 70B', value: 'meta-llama/llama-3.1-70b-instruct' },
  { label: 'Mistral Large', value: 'mistralai/mistral-large-latest' },
  { label: 'DeepSeek V3', value: 'deepseek/deepseek-chat-v3-0324' },
];

function getFollowUpSuggestions(lastMessage: string, pathname: string): { id: string; text: string }[] {
  if (lastMessage.includes('remediation') || lastMessage.includes('fix')) {
    return [
      { id: 'timeline', text: 'What timeline should I set for remediation?' },
      { id: 'assign', text: 'Who should own these remediation tasks?' },
      { id: 'evidence', text: 'What evidence will prove these are fixed?' },
    ];
  }
  if (lastMessage.includes('policy') || lastMessage.includes('policies')) {
    return [
      { id: 'template', text: 'Generate a full policy template' },
      { id: 'review', text: 'What should the review cadence be?' },
      { id: 'gaps', text: 'Which frameworks require this policy?' },
    ];
  }
  if (lastMessage.includes('audit') || lastMessage.includes('auditor')) {
    return [
      { id: 'prep', text: 'Create an audit preparation checklist' },
      { id: 'evidence_list', text: 'List all evidence an auditor will request' },
      { id: 'timeline', text: 'What is a realistic audit timeline?' },
    ];
  }
  if (pathname.includes('integration')) {
    return [
      { id: 'recommend', text: 'Which integrations would cover the most gaps?' },
      { id: 'mapping', text: 'Show me how this data maps to controls' },
    ];
  }
  return [
    { id: 'next', text: 'What should I focus on next?' },
    { id: 'board', text: 'Summarize this for my board' },
    { id: 'risk', text: 'What are the biggest risks right now?' },
  ];
}

function getSuggestedPrompts(pathname: string) {
  const base = [
    { id: 'posture', text: 'Summarize my compliance posture', iconName: 'security' as const },
    { id: 'priorities', text: 'What should I prioritize to improve my score?', iconName: 'status-warning' as const },
  ];
  if (pathname.includes('controls')) {
    return [
      { id: 'failing', text: 'Which controls are failing and why?', iconName: 'status-negative' as const },
      { id: 'remediate', text: 'Create a remediation plan for critical controls', iconName: 'script' as const },
      ...base,
    ];
  }
  if (pathname.includes('vendors')) {
    return [
      { id: 'vendorrisk', text: 'Analyze my vendor risk across the portfolio', iconName: 'status-warning' as const },
      { id: 'vendorgaps', text: 'Which vendors need immediate review?', iconName: 'flag' as const },
      ...base,
    ];
  }
  if (pathname.includes('policies')) {
    return [
      { id: 'policygaps', text: 'Identify gaps in my policy coverage', iconName: 'file' as const },
      { id: 'policydraft', text: 'Draft a data retention policy', iconName: 'edit' as const },
      ...base,
    ];
  }
  if (pathname.includes('evidence')) {
    return [
      { id: 'evidencegaps', text: 'Which controls are missing evidence?', iconName: 'search' as const },
      { id: 'evidencetypes', text: 'What evidence types do auditors expect?', iconName: 'file-open' as const },
      ...base,
    ];
  }
  if (pathname.includes('audits')) {
    return [
      { id: 'auditprep', text: 'How should I prepare for my next audit?', iconName: 'calendar' as const },
      { id: 'auditgaps', text: 'What gaps would an auditor find?', iconName: 'status-negative' as const },
      ...base,
    ];
  }
  if (pathname.includes('integration')) {
    return [
      { id: 'recommend', text: 'Which integrations should I connect first?', iconName: 'share' as const },
      { id: 'coverage', text: 'How much coverage would full integration give me?', iconName: 'status-positive' as const },
      ...base,
    ];
  }
  return [
    { id: 'overview', text: 'Give me a compliance health check', iconName: 'security' as const },
    { id: 'risks', text: 'What are my top compliance risks?', iconName: 'status-warning' as const },
    ...base,
  ];
}

export default function AIDrawer({ pathname }: { pathname: string }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [activeTab, setActiveTab] = useState('chat');
  const [savedConversations, setSavedConversations] = useState<AIConversation[]>([]);
  const [complianceContext, setComplianceContext] = useState({
    totalControls: 0,
    passingControls: 0,
    failingControls: 0,
    complianceScore: 0,
    frameworks: [] as string[],
    failingControlsList: [] as string[],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadContext() {
      const [cRes, fRes] = await Promise.all([
        supabase.from('controls').select('control_ref, title, status, risk_level'),
        supabase.from('frameworks').select('name'),
      ]);
      const controls = (cRes.data || []) as Control[];
      const frameworks = (fRes.data || []) as Framework[];
      const total = controls.length;
      const passing = controls.filter((c) => c.status === 'passing').length;
      const failing = controls.filter((c) => c.status === 'failing').length;
      setComplianceContext({
        totalControls: total,
        passingControls: passing,
        failingControls: failing,
        complianceScore: total > 0 ? Math.round((passing / total) * 100) : 0,
        frameworks: frameworks.map((f) => f.name),
        failingControlsList: controls
          .filter((c) => c.status === 'failing')
          .map((c) => `${c.control_ref}: ${c.title} (${c.risk_level})`),
      });
    }
    loadContext();
  }, []);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);
    setSavedConversations((data as AIConversation[]) || []);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const systemPrompt = buildComplianceSystemPrompt(complianceContext);
  const { messages, loading, streaming, sendMessageStreaming, clearMessages, setMessages, saveConversation } = useAI({
    systemPrompt,
    model: selectedModel.value,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setInputValue('');
    setActiveTab('chat');
    await sendMessageStreaming(text);
  };

  const handleSave = async () => {
    await saveConversation();
    loadConversations();
  };

  const handleLoadConversation = (conv: AIConversation) => {
    setMessages(conv.messages);
    setActiveTab('chat');
  };

  const suggestedPrompts = getSuggestedPrompts(pathname);
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const followUps = lastAssistantMsg ? getFollowUpSuggestions(lastAssistantMsg.content, pathname) : [];

  return (
    <Drawer
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {messages.length > 0 && (
                <Button variant="icon" iconName="download" ariaLabel="Save conversation" onClick={handleSave} />
              )}
              <Button variant="icon" iconName="remove" ariaLabel="Clear conversation" onClick={clearMessages} />
            </SpaceBetween>
          }
        >
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            Stakflo AI
            <Badge color="blue">Streaming</Badge>
          </SpaceBetween>
        </Header>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
        <div style={{ paddingBottom: '8px' }}>
          <Select
            selectedOption={selectedModel}
            onChange={({ detail }) => setSelectedModel(detail.selectedOption as typeof AI_MODELS[0])}
            options={AI_MODELS}
            expandToViewport
          />
        </div>

        <Tabs
          activeTabId={activeTab}
          onChange={({ detail }) => setActiveTab(detail.activeTabId)}
          tabs={[
            { id: 'chat', label: 'Chat' },
            { id: 'history', label: `History (${savedConversations.length})` },
          ]}
        />

        {activeTab === 'history' ? (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
            <SpaceBetween size="xs">
              {savedConversations.length === 0 ? (
                <Box variant="p" color="text-body-secondary" textAlign="center" padding="l">
                  No saved conversations yet. Use the save button to persist important chats.
                </Box>
              ) : (
                savedConversations.map(conv => (
                  <div
                    key={conv.id}
                    style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--color-border-divider-default, #e9ebed)' }}
                    onClick={() => handleLoadConversation(conv)}
                  >
                    <SpaceBetween size="xxs">
                      <Box variant="p" fontWeight="bold">{conv.title || 'Untitled'}</Box>
                      <SpaceBetween direction="horizontal" size="xs">
                        <Box variant="small" color="text-body-secondary">{new Date(conv.updated_at).toLocaleDateString()}</Box>
                        <Badge>{conv.context_type}</Badge>
                        <Box variant="small" color="text-body-secondary">{conv.messages.length} messages</Box>
                      </SpaceBetween>
                    </SpaceBetween>
                  </div>
                ))
              )}
            </SpaceBetween>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
              <SpaceBetween size="m">
                {messages.length === 0 && (
                  <SpaceBetween size="m">
                    <Box variant="p" color="text-body-secondary" textAlign="center" padding={{ top: 'l' }}>
                      Ask Stakflo AI about your compliance posture, get remediation plans, or draft policies.
                    </Box>
                    <SupportPromptGroup
                      ariaLabel="Suggested prompts"
                      alignment="vertical"
                      items={suggestedPrompts}
                      onItemClick={({ detail }) => {
                        const prompt = suggestedPrompts.find(p => p.id === detail.id);
                        if (prompt) handleSend(prompt.text);
                      }}
                    />
                  </SpaceBetween>
                )}

                {messages.map((msg, i) => (
                  <ChatBubble
                    key={i}
                    type={msg.role === 'user' ? 'outgoing' : 'incoming'}
                    ariaLabel={`${msg.role === 'user' ? 'You' : 'Stakflo AI'} at ${new Date(msg.timestamp).toLocaleTimeString()}`}
                    avatar={
                      <Avatar
                        color={msg.role === 'assistant' ? 'gen-ai' : 'default'}
                        iconName={msg.role === 'assistant' ? 'gen-ai' : 'user-profile'}
                        ariaLabel={msg.role === 'assistant' ? 'Stakflo AI' : 'You'}
                      />
                    }
                    actions={
                      msg.role === 'assistant' ? (
                        <ButtonGroup
                          variant="icon"
                          ariaLabel="Message actions"
                          items={[
                            { type: 'icon-button', id: 'copy', iconName: 'copy', text: 'Copy' },
                            { type: 'icon-button', id: 'like', iconName: 'thumbs-up', text: 'Helpful' },
                            { type: 'icon-button', id: 'dislike', iconName: 'thumbs-down', text: 'Not helpful' },
                          ]}
                          onItemClick={({ detail }) => {
                            if (detail.id === 'copy') navigator.clipboard.writeText(msg.content);
                          }}
                        />
                      ) : undefined
                    }
                  >
                    <MarkdownContent content={msg.content} />
                  </ChatBubble>
                ))}

                {loading && !streaming && (
                  <ChatBubble
                    type="incoming"
                    ariaLabel="Stakflo AI is generating"
                    showLoadingBar
                    avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" loading />}
                  >
                    <Box color="text-body-secondary">Analyzing...</Box>
                  </ChatBubble>
                )}

                {!loading && messages.length > 0 && followUps.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                  <SupportPromptGroup
                    ariaLabel="Follow-up questions"
                    alignment="horizontal"
                    items={followUps.map(f => ({ id: f.id, text: f.text }))}
                    onItemClick={({ detail }) => {
                      const fu = followUps.find(f => f.id === detail.id);
                      if (fu) handleSend(fu.text);
                    }}
                  />
                )}

                <div ref={messagesEndRef} />
              </SpaceBetween>
            </div>

            <LiveRegion hidden>
              {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content}
            </LiveRegion>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--color-border-divider-default, #e9ebed)', paddingTop: '12px' }}>
          <PromptInput
            value={inputValue}
            onChange={({ detail }) => setInputValue(detail.value)}
            onAction={({ detail }) => handleSend(detail.value)}
            placeholder="Ask about compliance, controls, policies..."
            actionButtonIconName="send"
            actionButtonAriaLabel="Send message"
            disableActionButton={!inputValue.trim() || loading}
            maxRows={4}
          />
        </div>
      </div>
    </Drawer>
  );
}
