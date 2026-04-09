import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Report, GeneratedReportData, UserProfile, IncidentTemplate } from '../types';
import { getChatResponse, generateJsonReport } from '../services/geminiService';
import { PaperAirplaneIcon, PaperClipIcon, SparklesIcon, UserCircleIcon, CalendarDaysIcon, CheckCircleIcon, TagIcon, TrashIcon, ClockIcon, ChatBubbleOvalLeftEllipsisIcon, XMarkIcon } from './icons';
import Calendar from './Calendar';

interface ChatInterfaceProps {
    onReportGenerated: (report: Report) => void;
    userProfile: UserProfile | null;
    initialDate?: Date | null;
    templates: IncidentTemplate[];
    onAddTemplate: (template: IncidentTemplate) => void;
    onDeleteTemplate: (templateId: string) => void;
    onNavToTimeline: () => void;
    isOffline: boolean;
}

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const COMMON_ISSUES = [
    { label: "Late Pickup", icon: <ClockIcon className="w-4 h-4"/>, text: "The other parent was late for pickup today. " },
    { label: "Missed Call", icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4"/>, text: "A scheduled phone call with the child was missed. " },
    { label: "Hostile Text", icon: <XMarkIcon className="w-4 h-4"/>, text: "I received a hostile text message. " },
    { label: "Schedule Change", icon: <CalendarDaysIcon className="w-4 h-4"/>, text: "There was a last-minute request to change the schedule. " },
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onReportGenerated, userProfile, initialDate, templates, onAddTemplate, onDeleteTemplate, onNavToTimeline, isOffline }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: "Hello, I'm here to help you document a co-parenting incident. To start, please describe what happened." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; data: string }[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [lastGeneratedReport, setLastGeneratedReport] = useState<Report | null>(null);
    const [templateToApply, setTemplateToApply] = useState<IncidentTemplate | null>(null);
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        // If the calendar is closed and we were trying to apply a template, cancel the action.
        if (!isCalendarOpen && templateToApply) {
            setTemplateToApply(null);
        }
    }, [isCalendarOpen, templateToApply]);

    const resetChat = () => {
        setMessages([
            { role: 'model', content: "Hello, I'm here to help you document a co-parenting incident. To start, please describe what happened." }
        ]);
        setInput('');
        setIsLoading(false);
        setIsGeneratingReport(false);
        setUploadedFiles([]);
        setSelectedDate(new Date());
        setLastGeneratedReport(null);
    };

    const handleSendMessage = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (!input.trim() && uploadedFiles.length === 0) return;

        const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
        let contentToSend = input;
        if (isFirstUserMessage && selectedDate) {
            contentToSend = `(Incident Date: ${selectedDate.toLocaleDateString()})\n\n${input}`;
        }

        setIsLoading(true);
        const userMessage: ChatMessage = {
            role: 'user',
            content: contentToSend,
            images: uploadedFiles.map(f => ({ mimeType: f.type, data: f.data }))
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setUploadedFiles([]);

        try {
            const response = await getChatResponse(newMessages, userProfile);
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, messages, uploadedFiles, selectedDate, userProfile]);
    
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setIsCalendarOpen(false);
    
        if (templateToApply) {
            const newReport: Report = {
                id: `rep_${Date.now()}`,
                createdAt: date.toISOString(),
                content: templateToApply.content,
                category: templateToApply.category,
                tags: templateToApply.tags,
                legalContext: templateToApply.legalContext,
                images: [], // No images for template-based reports
            };
            onReportGenerated(newReport);
            setTemplateToApply(null);
            alert(`Incident "${templateToApply.title}" was successfully logged for ${date.toLocaleDateString()}.`);
            onNavToTimeline();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const processedFiles = await Promise.all(
                files.map(async (file: File) => ({
                    name: file.name,
                    type: file.type,
                    data: await fileToBase64(file),
                }))
            );
            setUploadedFiles(prev => [...prev, ...processedFiles]);
        }
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            const reportData: GeneratedReportData | null = await generateJsonReport(messages, userProfile);
            if (reportData) {
                const allImagesFromChat = messages
                    .flatMap(m => m.images || [])
                    .map(img => `data:${img.mimeType};base64,${img.data}`);

                const newReport: Report = {
                    ...reportData,
                    id: `rep_${Date.now()}`,
                    createdAt: (selectedDate || new Date()).toISOString(),
                    images: allImagesFromChat,
                    legalContext: reportData.legalContext || '',
                };
                onReportGenerated(newReport);
                setLastGeneratedReport(newReport);
            } else {
                 setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I was unable to generate a report from our conversation. Please try adding more details and generating it again." }]);
            }
        } catch (error) {
            console.error(error);
             setMessages(prev => [...prev, { role: 'model', content: "An unexpected error occurred while generating the report." }]);
        } finally {
            setIsGeneratingReport(false);
        }
    };
    
    const handleSaveTemplate = () => {
        if (!lastGeneratedReport) return;
        const title = prompt("Enter a short name for this Quick Link (e.g., 'Late pickup', 'Refused call'):");
        if (title && title.trim()) {
            const newTemplate: IncidentTemplate = {
                id: `tpl_${Date.now()}`,
                title: title.trim(),
                content: lastGeneratedReport.content,
                category: lastGeneratedReport.category,
                tags: lastGeneratedReport.tags,
                legalContext: lastGeneratedReport.legalContext,
            };
            onAddTemplate(newTemplate);
            alert(`Quick Link "${title.trim()}" saved!`);
        }
    };
    
    const handleTemplateClick = (template: IncidentTemplate) => {
        setTemplateToApply(template);
        setIsCalendarOpen(true);
    };

    const handleQuickIssueClick = (text: string) => {
        setInput(prev => prev + text);
        textareaRef.current?.focus();
    };

    if (lastGeneratedReport) {
        return (
            <div className="flex flex-col h-full bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-sm items-center justify-center text-center p-6">
                <CheckCircleIcon className="w-20 h-20 text-green-500" />
                <h1 className="text-2xl font-bold text-gray-900 mt-4">Report Generated Successfully</h1>
                <p className="mt-2 text-gray-600 max-w-md">Your incident has been logged. You can save this report as a Quick Link for faster logging of similar events in the future.</p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleSaveTemplate}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 transition-all"
                    >
                        <TagIcon className="w-5 h-5"/>
                        Save as Quick Link
                    </button>
                    <button
                        onClick={resetChat}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Log Another Incident
                    </button>
                    <button
                        onClick={onNavToTimeline}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800"
                    >
                        View on Timeline
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-sm">
            {showTemplateManager && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTemplateManager(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900">Manage Quick Links</h3>
                        <p className="text-sm text-gray-600 mt-1">Delete any Quick Links you no longer need.</p>
                        <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                            {templates.length > 0 ? templates.map(t => (
                                <li key={t.id} className="flex justify-between items-center p-2 pl-3 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium text-gray-800">{t.title}</span>
                                    <button onClick={() => onDeleteTemplate(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-200">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </li>
                            )) : <p className="text-sm text-gray-500 text-center py-4">No Quick Links saved yet.</p>}
                        </ul>
                        <button onClick={() => setShowTemplateManager(false)} className="mt-6 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800">
                            Done
                        </button>
                    </div>
                </div>
            )}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">New Incident Report</h1>
                <p className="mt-1 text-sm text-gray-600 max-w-3xl">Describe the incident below, or use a Quick Link to log a recurring issue instantly.</p>
            </div>
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div className="space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-gray-500"/></div>}
                            <div className={`max-w-xl px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-950 text-white rounded-br-lg' : 'bg-gray-100 text-gray-900 rounded-bl-lg'}`}>
                                <p className="text-sm leading-6 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><UserCircleIcon className="w-6 h-6 text-gray-500"/></div>}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-gray-500"/></div>
                            <div className="max-w-lg px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-lg">
                                <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>
            
            {/* Common Issues Quick Bar - Fixed above input area */}
            {messages.length === 1 && !isOffline && (
                 <div className="px-4 pt-2 pb-0 flex gap-2 overflow-x-auto no-scrollbar">
                    {COMMON_ISSUES.map((issue, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleQuickIssueClick(issue.text)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                        >
                            {issue.icon}
                            {issue.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="p-4 bg-white border-t border-gray-200 sm:rounded-b-lg">
                 {templates.length > 0 && !isGeneratingReport && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Quick Links</h4>
                            <button onClick={() => setShowTemplateManager(true)} className="text-xs font-medium text-blue-700 hover:underline">Manage</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateClick(template)}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                                    title={`Log "${template.title}"`}
                                >
                                    {template.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.length > 2 && (
                    <div className="mb-4 flex justify-end">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport || isOffline}
                            className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 transform hover:-translate-y-px"
                            title={isOffline ? "Report generation is disabled while offline." : ""}
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isGeneratingReport ? 'Generating...' : 'Generate Incident Report'}
                        </button>
                    </div>
                )}
                <div className="relative">
                     {isCalendarOpen && (
                        <div className="absolute bottom-full mb-2 left-0 z-10">
                            <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={isOffline ? "You are offline. AI chat is unavailable." : "Or, describe a new incident here..."}
                        rows={1}
                        className="w-full pl-20 sm:pl-24 pr-12 py-3 text-sm resize-none border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 disabled:bg-gray-50"
                        disabled={isOffline}
                    />
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/jpeg,image/png,image/webp" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors" aria-label="Attach files">
                             <PaperClipIcon className="w-5 h-5" />
                        </button>
                         <button 
                            onClick={() => setIsCalendarOpen(prev => !prev)} 
                            className="flex items-center gap-1 p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Select incident date"
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                            {selectedDate && <span className="text-xs font-medium pr-1 hidden sm:inline">{selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                        </button>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && uploadedFiles.length === 0) || isOffline} className="p-2 text-white bg-blue-950 rounded-full hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors" aria-label="Send message">
                             <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 pl-4">
                        Attached: {uploadedFiles.map(f => f.name).join(', ')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatInterface;