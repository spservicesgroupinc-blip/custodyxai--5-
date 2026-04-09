import React, { useState } from 'react';
import { StoredDocument } from '../types';
import { XMarkIcon, PrinterIcon, ClipboardDocumentIcon, CheckIcon } from './icons';
import PdfPreview from './PdfPreview';
import ReactMarkdown from 'react-markdown';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: StoredDocument | null;
}

const documentToPlainText = (doc: StoredDocument | null): string => {
    if (!doc) return "";
    if (doc.structuredData) {
        let text = `${doc.structuredData.title}\n\n`;
        if (doc.structuredData.subtitle) text += `${doc.structuredData.subtitle}\n\n`;
        text += `Date: ${doc.structuredData.metadata.date}\n`;
        if(doc.structuredData.metadata.clientName) text += `Client: ${doc.structuredData.metadata.clientName}\n`;
        if(doc.structuredData.metadata.caseNumber) text += `Case No.: ${doc.structuredData.metadata.caseNumber}\n\n`;
        if(doc.structuredData.preamble) text += `${doc.structuredData.preamble}\n\n`;
        doc.structuredData.sections.forEach(s => {
            text += `${s.heading}\n\n${s.body}\n\n`;
        });
        if(doc.structuredData.closing) text += `${doc.structuredData.closing}\n\n`;
        if(doc.structuredData.notes) text += `Notes: ${doc.structuredData.notes}\n`;
        return text;
    }
    
    // For other text-based docs, decode from base64
    if (doc.mimeType.startsWith('text/')) {
        try {
            return decodeURIComponent(escape(atob(doc.data)));
        } catch (e) {
            console.error("Failed to decode base64 data:", e);
            return "Error: Could not display content.";
        }
    }
    
    return "Plain text version is not available for this file type.";
};


const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, document }) => {
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen || !document) {
        return null;
    }

    const copyToClipboard = () => {
        const plainText = documentToPlainText(document);
        if (plainText.includes("not available")) return;
        navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handlePrint = () => {
        if (document?.mimeType === 'application/pdf' && document.data) {
            try {
                const byteCharacters = atob(document.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const pdfWindow = window.open(url);
                if (pdfWindow) {
                    pdfWindow.focus();
                } else {
                    alert('Please allow pop-ups for this site to view the PDF.');
                }
            } catch (e) {
                console.error('Error opening PDF for printing:', e);
                alert('Could not open the PDF file.');
            }
        } else {
            window.print();
        }
    };

    const renderContent = () => {
        if (document.structuredData) {
            return <PdfPreview document={document.structuredData} />;
        }
        
        const dataUri = `data:${document.mimeType};base64,${document.data}`;

        switch (document.mimeType) {
            case 'application/pdf':
                return (
                    <div className="printable-area h-full w-full">
                        <iframe src={dataUri} className="w-full h-full" title={document.name} />
                    </div>
                );
            case 'text/markdown':
                try {
                    const markdownContent = decodeURIComponent(escape(atob(document.data)));
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto prose prose-slate">
                            <ReactMarkdown>{markdownContent}</ReactMarkdown>
                        </div>
                    );
                } catch (e) {
                    return <div className="p-4">Error displaying Markdown content.</div>;
                }
            case 'text/plain':
                try {
                    const textContent = decodeURIComponent(escape(atob(document.data)));
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{textContent}</pre>
                        </div>
                    );
                } catch(e) {
                    return <div className="p-4">Error displaying text content.</div>;
                }
            default:
                 if (document.mimeType.startsWith('image/')) {
                    return (
                        <div className="printable-area p-8 bg-white max-w-4xl mx-auto flex justify-center items-center">
                            <img src={dataUri} alt={document.name} className="max-w-full max-h-full object-contain" />
                        </div>
                    );
                }
                return <div className="p-4">Preview is not available for this file type ({document.mimeType}).</div>;
        }
    };

    const canCopy = document.mimeType.startsWith('text/') || !!document.structuredData;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-200 no-print">
                    <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{document.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 flex-shrink-0" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 bg-gray-100 overflow-y-auto">
                    {renderContent()}
                </main>

                <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 no-print">
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Print / Save as PDF
                    </button>
                    {canCopy && (
                        <button onClick={copyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800">
                            {isCopied ? <CheckIcon className="w-5 h-5 mr-2" /> : <ClipboardDocumentIcon className="w-5 h-5 mr-2" />}
                            {isCopied ? 'Copied!' : 'Copy Plain Text'}
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DocumentViewerModal;