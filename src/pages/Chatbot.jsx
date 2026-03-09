import { useState } from 'react';
import LLM from "@themaximalist/llm.js"

export default function Chatbot_test() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [llmModel, setLlmModel] = useState('google');

    const llmConfig = {
        google: { service: "google", model: "gemini-2.5-flash", apiKey: "AIzaSyCm8qfp0MnGI0A2DO3idNwjBlmBJIKqqYk" },
        openai: { service: "openai", apiKey: "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" },
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'Bruker', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            console.log('LLM config being used:', llmConfig[llmModel]);
            const llm = new LLM(llmConfig[llmModel]);
            llm.system("You are a norwegian assistant and you are a reqruitment agent and you need to make reqruitment ads.")
                ;
            const models = await llm.fetchModels();
            // request extended response so we can inspect usage, service, etc.
            const response = await llm.chat(input);

            console.log(models)
            console.log('Raw LLM.js response object:', response);

            // response may be a string if not extended; handle both
            const content = typeof response === 'string' ? response : response.content;
            const aiMessage = { role: 'Datamaskinen', content };
            setMessages((prev) => [...prev, aiMessage]);
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
                        <strong>{msg.role}:</strong> {msg.content}
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