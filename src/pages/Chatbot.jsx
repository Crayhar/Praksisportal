import { useState } from 'react';
import LLM from "@themaximalist/llm.js"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chatbot_test() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [llmModel, setLlmModel] = useState('google');

    const llmConfig = {
        google: { service: "google", model: "gemini-2.5-flash", apiKey: "AIzaSyCm8qfp0MnGI0A2DO3idNwjBlmBJIKqqYk" },
        openai: { service: "openai", apiKey: "" },
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'Bruker', content: input };
        setMessages((prev) => [...prev, userMessage]);
        const prompt = input;
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
                setMessages((prev) => [...prev, { role: 'Datamaskinen', content: '' }]);

                for await (const chunk of response.stream) {
                    if (chunk.type !== 'content' || !chunk.content) {
                        continue;
                    }

                    content += chunk.content;
                    setMessages((prev) => {
                        const next = [...prev];
                        next[next.length - 1] = { role: 'Datamaskinen', content };
                        return next;
                    });
                }

                const completeResponse = await response.complete();
                console.log('Completed LLM.js response object:', completeResponse);
            } else if (response && typeof response[Symbol.asyncIterator] === 'function') {
                setMessages((prev) => [...prev, { role: 'Datamaskinen', content: '' }]);

                for await (const chunk of response) {
                    if (!chunk) {
                        continue;
                    }

                    content += chunk;
                    setMessages((prev) => {
                        const next = [...prev];
                        next[next.length - 1] = { role: 'Datamaskinen', content };
                        return next;
                    });
                }
            } else {
                console.log('Raw LLM.js response object:', response);
                content = typeof response === 'string' ? response : response?.content ?? '';
                setMessages((prev) => [...prev, { role: 'Datamaskinen', content }]);
            }
        } catch (error) {
            console.error('ListModels', error);
            setMessages((prev) => [...prev, { role: 'Datamaskinen', content: 'Error: Failed to get response' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h1>Chatbot Test</h1>

            <div style={{ marginBottom: '15px' }}>
                <label>Select LLM: </label>
                <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)}>
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'auto', padding: '10px', marginBottom: '15px' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '10px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
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
                            </div>
                        ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type message..."
                    disabled={loading}
                    style={{ flex: 1, padding: '8px' }}
                />
                <button onClick={handleSendMessage} disabled={loading}>
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
}
