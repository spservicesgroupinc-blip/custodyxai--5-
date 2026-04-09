
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import IncidentTimeline from './components/IncidentTimeline';
import ChatInterface from './components/ChatInterface';
import PatternAnalysis from './components/PatternAnalysis';
import DeepAnalysis from './components/BehavioralInsights';
import LegalAssistant from './components/LegalAssistant';
import UserProfile from './components/UserProfile';
import DocumentLibrary from './components/DocumentLibrary';
import CalendarView from './components/CalendarView';
import EvidencePackageBuilder from './components/EvidencePackageBuilder';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import AgentChat from './components/AgentChat';
import Toast from './components/Toast';
import Messaging from './components/Messaging';
import AuthScreen from './components/AuthScreen';
import { Report, UserProfile as UserProfileType, StoredDocument, View, IncidentTemplate, User } from './types';
import { SparklesIcon } from './components/icons';
import { api } from './services/api';

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [view, setView] = useState<View>('dashboard');
    
    // Data State - Initialize empty, load from API after auth
    const [reports, setReports] = useState<Report[]>([]);
    const [documents, setDocuments] = useState<StoredDocument[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
    const [incidentTemplates, setIncidentTemplates] = useState<IncidentTemplate[]>([]);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [activeReportContext, setActiveReportContext] = useState<Report | null>(null);
    const [activeInsightContext, setActiveInsightContext] = useState<Report | null>(null);
    const [initialLegalQuery, setInitialLegalQuery] = useState<string | null>(null);
    const [activeAnalysisContext, setActiveAnalysisContext] = useState<string | null>(null);
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [isEvidenceBuilderOpen, setIsEvidenceBuilderOpen] = useState(false);
    const [newReportDate, setNewReportDate] = useState<Date | null>(null);
    const [isConfigError, setIsConfigError] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // PWA State
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showUpdate, setShowUpdate] = useState(false);
    const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | null>(null);

    // Data Sync Logic
    const loadUserData = useCallback(async (userId: string) => {
        setIsLoadingData(true);
        try {
            const data = await api.syncData(userId);
            setReports(data.reports || []);
            setIncidentTemplates(data.templates || []);
            setUserProfile(data.profile || null);
            setDocuments(data.documents || []);
        } catch (error) {
            console.error("Failed to sync data:", error);
            // Fallback or error handling
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (!process.env.API_KEY) {
            console.error("Configuration Error: API_KEY is not defined.");
            setIsConfigError(true);
        }

        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        if ('serviceWorker' in navigator) {
            const registerSW = async () => {
                try {
                    const swUrl = new URL('/service-worker.js', window.location.origin).toString();
                    const registration = await navigator.serviceWorker.register(swUrl);
                    serviceWorkerRegistration.current = registration;
                    
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                } catch (err) {
                    console.error('ServiceWorker registration failed: ', err);
                }
            };
            registerSW();
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }

        // Check for existing session (simplified)
        const storedUser = localStorage.getItem('custodyx_user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            loadUserData(u.userId);
        }
        setAuthChecked(true);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [loadUserData]);

    const handleLogin = (u: User) => {
        setUser(u);
        localStorage.setItem('custodyx_user', JSON.stringify(u));
        loadUserData(u.userId);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('custodyx_user');
        setReports([]);
        setDocuments([]);
        setIncidentTemplates([]);
        setUserProfile(null);
    };

    // Persistence Wrappers - Optimistic UI updates with rollback on failure
    const handleProfileSave = async (profile: UserProfileType) => {
        const previousProfile = userProfile;
        setUserProfile(profile); // Optimistic
        setView('dashboard');
        if (user) {
            try {
                await api.saveProfile(user.userId, profile);
            } catch (error) {
                console.error('Failed to save profile:', error);
                setUserProfile(previousProfile); // Rollback
            }
        }
    };

    const handleReportGenerated = async (newReport: Report) => {
        const previousReports = reports;
        setReports(prev => [...prev, newReport]); // Optimistic
        setNewReportDate(null);
        if (user) {
            try {
                await api.saveReports(user.userId, [newReport]);
            } catch (error) {
                console.error('Failed to save report:', error);
                setReports(previousReports); // Rollback
            }
        }
    };
    
    const handleAddDocument = useCallback(async (newDocument: StoredDocument) => {
        const previousDocuments = [...documents];
        setDocuments(prev => [...prev, newDocument]); // Optimistic
        if (user) {
            try {
                await api.saveDocuments(user.userId, [newDocument]);
            } catch (error) {
                console.error('Failed to save document:', error);
                setDocuments(previousDocuments); // Rollback
            }
        }
    }, [user, documents]);

    const handleDeleteDocument = useCallback(async (documentId: string) => {
        const previousDocuments = [...documents];
        setDocuments(prev => prev.filter(doc => doc.id !== documentId)); // Optimistic delete
        if (user) {
            try {
                await api.deleteDocument(user.userId, documentId);
            } catch (error) {
                console.error('Failed to delete document:', error);
                setDocuments(previousDocuments); // Rollback
            }
        }
    }, [user, documents]);
    
    const handleAddTemplate = useCallback(async (newTemplate: IncidentTemplate) => {
        const previousTemplates = [...incidentTemplates];
        setIncidentTemplates(prev => [...prev, newTemplate]);
        if (user) {
            try {
                await api.saveTemplates(user.userId, [newTemplate]);
            } catch (error) {
                console.error('Failed to save template:', error);
                setIncidentTemplates(previousTemplates); // Rollback
            }
        }
    }, [user, incidentTemplates]);

    const handleDeleteTemplate = useCallback(async (templateId: string) => {
        const previousTemplates = [...incidentTemplates];
        setIncidentTemplates(prev => prev.filter(t => t.id !== templateId));
        if (user) {
            try {
                await api.deleteTemplate(user.userId, templateId);
            } catch (error) {
                console.error('Failed to delete template:', error);
                setIncidentTemplates(previousTemplates); // Rollback
            }
        }
    }, [user, incidentTemplates]);

    const handleViewChange = useCallback((newView: View) => {
        if (newView !== 'new_report') setNewReportDate(null);
        setView(newView);
        setIsSidebarOpen(false);
    }, []);


    // ... Existing Handlers ...
    const handleDiscussIncident = (reportId: string) => {
        const reportToDiscuss = reports.find(r => r.id === reportId);
        if (reportToDiscuss) {
            setActiveReportContext(reportToDiscuss);
            setActiveAnalysisContext(null);
            handleViewChange('assistant');
        }
    };

    const handleAnalyzeIncident = (reportId: string) => {
        const reportToAnalyze = reports.find(r => r.id === reportId);
        if (reportToAnalyze) {
            setActiveInsightContext(reportToAnalyze);
            handleViewChange('insights');
        }
    };
    
    const handleGenerateDraftFromInsight = (analysisText: string, motionType: string) => {
        const query = `Based on the provided deep analysis, please draft a "${motionType}".`;
        setActiveAnalysisContext(analysisText);
        setActiveReportContext(null);
        setInitialLegalQuery(query);
        setView('assistant');
        setActiveInsightContext(null);
    };

    const handleBackToTimeline = () => {
        setView('timeline');
        setActiveInsightContext(null);
    };

    const handleToggleReportSelection = (reportId: string) => {
        setSelectedReportIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
    };

    const handleCalendarDayClick = (date: Date) => {
        setNewReportDate(date);
        setView('new_report');
    };

    const handleClearSelection = () => {
        setSelectedReportIds(new Set());
    };

    const handleGetStarted = () => {
        setView('profile'); // This logic might need adjusting with Auth flow
    };

    const handleAgentClick = () => {
        setIsAgentOpen(true);
    };

    const handleBuildPackageClick = () => {
        setIsEvidenceBuilderOpen(true);
    };

    const handleUpdate = () => {
        const registration = serviceWorkerRegistration.current;
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            setShowUpdate(false);
        }
    };

    // Render Logic
    if (isConfigError) {
        return (
            <div className="bg-red-50 min-h-screen flex items-center justify-center p-4 text-center">
                 <div className="bg-white p-8 rounded-lg shadow-lg border border-red-200 max-w-md">
                    <h1 className="text-2xl font-bold text-red-800">Configuration Error</h1>
                    <p className="mt-2 text-red-700">Missing API Key.</p>
                </div>
            </div>
        );
    }

    if (!authChecked) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    if (!user) {
        return <AuthScreen onLogin={handleLogin} />;
    }
    
    // User is logged in
    
    // Determine if onboarding is needed
    const isUserOnboarded = !!userProfile;
    const isInitialSetup = !isUserOnboarded && view === 'profile'; // Profile is default if no profile exists? 
    // Actually, stick to logic: if no profile, force profile view unless on dashboard/landing?
    // Let's force profile view if user has no profile data
    if (!isLoadingData && !userProfile && view !== 'profile') {
        // Automatically redirect to profile creation
        // We render UserProfile directly here
        return (
             <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
                 <UserProfile 
                    onSave={handleProfileSave} 
                    onCancel={() => {}} // Cannot cancel initial setup
                    currentProfile={null}
                    isInitialSetup={true}
                />
            </div>
        );
    }

    const renderView = () => {
        const selectionProps = {
            selectedReportIds,
            onToggleReportSelection: handleToggleReportSelection,
        };
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                            userProfile={userProfile}
                            reports={reports}
                            onViewChange={handleViewChange}
                            onAnalyzeIncident={handleAnalyzeIncident}
                        />;
            case 'new_report':
                return <ChatInterface 
                            onReportGenerated={handleReportGenerated} 
                            userProfile={userProfile}
                            initialDate={newReportDate} 
                            templates={incidentTemplates}
                            onAddTemplate={handleAddTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                            onNavToTimeline={() => handleViewChange('timeline')}
                            isOffline={isOffline}
                        />;
            case 'patterns':
                return <PatternAnalysis 
                            reports={reports} 
                            documents={documents}
                            userProfile={userProfile} 
                            isOffline={isOffline} 
                        />;
            case 'insights':
                return <DeepAnalysis 
                            reports={reports} 
                            userProfile={userProfile}
                            activeInsightContext={activeInsightContext}
                            onBackToTimeline={handleBackToTimeline}
                            onGenerateDraft={handleGenerateDraftFromInsight}
                            onAddDocument={handleAddDocument}
                            isOffline={isOffline}
                        />;
            case 'documents':
                return <DocumentLibrary 
                            documents={documents}
                            onAddDocument={handleAddDocument}
                            onDeleteDocument={handleDeleteDocument}
                        />;
            case 'assistant':
                return <LegalAssistant 
                            reports={reports} 
                            documents={documents}
                            userProfile={userProfile}
                            activeReportContext={activeReportContext}
                            clearActiveReportContext={() => setActiveReportContext(null)}
                            initialQuery={initialLegalQuery}
                            clearInitialQuery={() => setInitialLegalQuery(null)}
                            activeAnalysisContext={activeAnalysisContext}
                            clearActiveAnalysisContext={() => setActiveAnalysisContext(null)}
                            onAddDocument={handleAddDocument}
                            isOffline={isOffline}
                        />;
            case 'profile':
                return <UserProfile 
                            onSave={handleProfileSave} 
                            onCancel={() => handleViewChange('dashboard')}
                            currentProfile={userProfile}
                        />;
            case 'calendar':
                return <CalendarView 
                            reports={reports}
                            onDiscussIncident={handleDiscussIncident}
                            onAnalyzeIncident={handleAnalyzeIncident}
                            onDayClick={handleCalendarDayClick}
                            {...selectionProps}
                        />;
            case 'messaging':
                return <Messaging 
                            user={user} 
                            onAddDocument={handleAddDocument} 
                        />;
            case 'timeline':
            default:
                return <IncidentTimeline 
                            reports={reports} 
                            onDiscussIncident={handleDiscussIncident}
                            onAnalyzeIncident={handleAnalyzeIncident}
                            {...selectionProps}
                        />;
        }
    };
    
    const isChatView = view === 'new_report' || view === 'assistant' || view === 'messaging';

    return (
        <div className="h-[100dvh] bg-gray-100 flex flex-col">
            <Header 
                onMenuClick={() => setIsSidebarOpen(prev => !prev)} 
                onProfileClick={() => handleViewChange('profile')}
                onAgentClick={handleAgentClick}
            />
            <div className="flex flex-1 pt-16 overflow-hidden">
                 {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
                        onClick={() => setIsSidebarOpen(false)}
                        aria-hidden="true"
                    ></div>
                )}
                <Sidebar 
                    activeView={view} 
                    onViewChange={handleViewChange} 
                    reportCount={reports.length}
                    isOpen={isSidebarOpen}
                />
                <main className={`flex-1 ${isChatView ? 'p-0 sm:p-6 lg:p-8 flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'}`}>
                    <div className={`mx-auto max-w-7xl w-full ${isChatView ? 'flex-1 min-h-0' : ''}`}>
                        {isLoadingData ? (
                            <div className="flex justify-center items-center h-full">
                                <SparklesIcon className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : renderView()}
                    </div>
                </main>
            </div>
             {selectedReportIds.size > 0 && (view === 'timeline' || view === 'calendar') && (
                <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 no-print">
                    <button
                        onClick={handleClearSelection}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Clear Selection ({selectedReportIds.size})
                    </button>
                    <button
                        onClick={handleBuildPackageClick}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-950 rounded-full shadow-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-transform"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Build Evidence Package
                    </button>
                </div>
            )}
            <AgentChat
                isOpen={isAgentOpen}
                onClose={() => setIsAgentOpen(false)}
                onNavigate={(newView) => {
                    handleViewChange(newView);
                    setIsAgentOpen(false);
                }}
                userProfile={userProfile}
                isOffline={isOffline}
            />
            <EvidencePackageBuilder
                isOpen={isEvidenceBuilderOpen}
                onClose={() => setIsEvidenceBuilderOpen(false)}
                selectedReports={reports.filter(r => selectedReportIds.has(r.id))}
                allDocuments={documents}
                userProfile={userProfile}
                onPackageCreated={() => {
                    setIsEvidenceBuilderOpen(false);
                    setSelectedReportIds(new Set());
                }}
                onAddDocument={handleAddDocument}
                isOffline={isOffline}
            />
            <Toast
                show={isOffline}
                message="You are currently offline. Changes will sync when online."
                type="warning"
            />
            <Toast
                show={showUpdate}
                message="A new version is available."
                type="info"
                onAction={handleUpdate}
                actionText="Refresh"
            />
            {/* Simple logout button for testing, placed absolutely */}
            <button onClick={handleLogout} className="fixed bottom-2 left-2 text-xs text-gray-400 hover:text-gray-600">Logout</button>
        </div>
    );
};

export default App;
