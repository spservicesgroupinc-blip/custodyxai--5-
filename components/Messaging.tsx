
import React, { useState, useEffect, useRef } from 'react';
import { User, StoredDocument, Message } from '../types';
import { api } from '../services/api';
import { PaperAirplaneIcon, ChatBubbleOvalLeftEllipsisIcon } from './icons';

interface MessagingProps {
    user: User;
    onAddDocument: (document: StoredDocument) => void;
}

const Messaging: React.FC<MessagingProps> = ({ user, onAddDocument }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load & Polling for new messages
    useEffect(() => {
        let isMounted = true;
        const fetchMessages = async () => {
            try {
                // In a real app, we'd pass the last known timestamp to optimize
                const msgs = await api.getMessages(user.userId);
                if (isMounted) {
                    setMessages(msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user.userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const content = inputValue;
        setInputValue('');
        
        // Optimistic update
        const tempMsg: Message = {
            id: `temp_${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await api.sendMessage(user.userId, content, 'user');
            // We rely on polling to confirm/update the message list from server
        } catch (err) {
            console.error("Failed to send", err);
            // Optionally handle error (remove optimistic msg, etc.)
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Secure Messaging</h2>
                    <p className="text-sm text-gray-600">Messages are stored in your private database.</p>
                </div>
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-2" />
                        <p>No messages yet.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}>
                            <p>{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Messaging;
