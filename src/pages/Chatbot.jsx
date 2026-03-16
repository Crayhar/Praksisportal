import { useEffect, useRef, useState } from 'react';
import LLM from "@themaximalist/llm.js"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chatbot_test() {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [llmModel, setLlmModel] = useState('google');

    const llmConfig = {
        google: { service: "google", model: "gemini-2.5-flash", apiKey: geminiApiKey },
        openai: { service: "openai", apiKey: "" },
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!inputRef.current) return;

        inputRef.current.style.height = '0px';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }, [input]);

    const updateAssistantMessage = (messageId, content, isStreaming) => {
        setMessages((prev) =>
            prev.map((message) =>
                message.id === messageId ? { ...message, content, isStreaming } : message
            )
        );
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        if (llmModel === 'google' && !geminiApiKey) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'Datamaskinen',
                    content: 'Error: Missing VITE_GEMINI_API_KEY environment variable.',
                    isStreaming: false,
                },
            ]);
            return;
        }

        const prompt = input;
        const userMessage = { id: crypto.randomUUID(), role: 'Bruker', content: prompt, isStreaming: false };
        const assistantMessageId = crypto.randomUUID();
        const assistantMessage = { id: assistantMessageId, role: 'Datamaskinen', content: '', isStreaming: true };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setInput('');
        setLoading(true);

        try {
            console.log('LLM config being used:', llmConfig[llmModel]);
            const llm = new LLM(llmConfig[llmModel]);
            llm.system("You are a norwegian assistant and you are a reqruitment agent and you need to make reqruitment ads.")
            const response = await llm.chat(prompt, {
                stream: true,
                max_tokens: 4096,
            });

            let content = '';

            if (response?.stream) {
                for await (const chunk of response.stream) {
                    if (chunk.type !== 'content' || !chunk.content) {
                        continue;
                    }

                    content += chunk.content;
                    updateAssistantMessage(assistantMessageId, content, true);
                }

                const completeResponse = await response.complete();
                console.log('Completed LLM.js response object:', completeResponse);
            } else if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const chunk of response) {
                    if (!chunk) {
                        continue;
                    }

                    content += chunk;
                    updateAssistantMessage(assistantMessageId, content, true);
                }
            } else {
                console.log('Raw LLM.js response object:', response);
                content = typeof response === 'string' ? response : response?.content ?? '';
                updateAssistantMessage(assistantMessageId, content, false);
                return;
            }

            updateAssistantMessage(assistantMessageId, content, false);
        } catch (error) {
            console.error('ListModels', error);
            updateAssistantMessage(assistantMessageId, 'Error: Failed to get response', false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <style>
                {`
                    @keyframes chatbot-cursor-blink {
                        0%, 49% { opacity: 1; }
                        50%, 100% { opacity: 0; }
                    }
                `}
            </style>
            <h1>Chatbot Test</h1>

            <div style={{ marginBottom: '15px' }}>
                <label>Select LLM: </label>
                <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)}>
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div style={{ border: '1px solid #ccc', borderRadius: '20px', height: '400px', overflowY: 'auto', padding: '14px', marginBottom: '15px' }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: '10px', textAlign: msg.role === 'Bruker' ? 'right' : 'left' }}>
                        <strong>{msg.role}:</strong>{' '}
                        {msg.role === 'Datamaskinen' ? (
                            <div
                                style={{
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    textAlign: 'left',
                                    whiteSpace: 'normal',
                                }}
                            >
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                                        ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: '20px' }}>{children}</ul>,
                                        ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: '20px' }}>{children}</ol>,
                                        li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                                        code: ({ inline, children }) => (
                                            inline ? (
                                                <code style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px' }}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <code style={{ display: 'block', background: '#f3f4f6', padding: '10px', borderRadius: '6px', overflowX: 'auto' }}>
                                                    {children}
                                                </code>
                                            )
                                        ),
                                        pre: ({ children }) => <pre style={{ margin: '0 0 8px' }}>{children}</pre>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                                {msg.isStreaming ? (
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            animation: 'chatbot-cursor-blink 1s step-start infinite',
                                        }}
                                    >
                                        ▍
                                    </span>
                                ) : null}
                            </div>
                        ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder="Type message..."
                    disabled={loading}
                    rows={1}
                    style={{
                        flex: 1,
                        padding: '8px',
                        minHeight: '38px',
                        maxHeight: '160px',
                        resize: 'none',
                        overflowY: 'auto',
                        lineHeight: 1.4,
                        font: 'inherit',
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={loading}
                    style={{ borderRadius: '10px', padding: '5px' }}
                >
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
}
