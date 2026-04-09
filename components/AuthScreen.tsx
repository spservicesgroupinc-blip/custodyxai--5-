
import React, { useState, useEffect } from 'react';
import { api, setApiUrl, getApiUrl } from '../services/api';
import { User } from '../types';
import { BookOpenIcon, LockClosedIcon, CheckCircleIcon, XMarkIcon, SparklesIcon } from './icons';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [showConfig, setShowConfig] = useState(false);
    
    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());
    
    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Automatically show config if missing on mount, but inside the modal
        if (!getApiUrl()) {
            // We don't force the view, but we ensure the input is empty or ready
        }
    }, []);

    const handleConfigSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiUrlInput.trim()) {
            setError('Please enter a valid URL');
            return;
        }
        setApiUrl(apiUrlInput);
        setShowConfig(false);
        setError('');
        setSuccessMessage('Server connection updated.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!getApiUrl()) {
            setError('Server connection not configured. Please click "Server Settings" below.');
            return;
        }

        if (authMode === 'signup' && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            let user;
            if (authMode === 'login') {
                user = await api.login(email, password);
            } else {
                user = await api.signup(email, password);
            }
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Authentication failed. Please check your credentials and connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                
                {/* Left Side - Brand & Marketing */}
                <div className="hidden md:flex flex-col justify-between bg-blue-950 w-1/2 p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <BookOpenIcon className="h-8 w-8 text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight">CustodyX.ai</span>
                        </div>
                        <h2 className="text-4xl font-bold leading-tight mb-6">
                            Document with confidence. <br/> Co-parent with clarity.
                        </h2>
                        <p className="text-blue-200 text-lg leading-relaxed">
                            The neutral, AI-powered platform designed to help you maintain accurate records, analyze patterns, and focus on what matters most—your children.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-medium">Court-ready incident reports</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-medium">Secure, private database</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-medium">AI behavioral analysis</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Auth Form */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center relative bg-white">
                    <div className="max-w-md w-full mx-auto">
                        <div className="text-center mb-10">
                             <div className="md:hidden flex justify-center mb-4">
                                <div className="bg-blue-950 p-2 rounded-lg">
                                    <BookOpenIcon className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">
                                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="mt-2 text-sm text-gray-600">
                                {authMode === 'login' 
                                    ? 'Please sign in to access your dashboard.' 
                                    : 'Start documenting your journey today.'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
                                <span className="font-bold">Error:</span> {error}
                            </div>
                        )}
                        
                        {successMessage && (
                            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" />
                                {successMessage}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>

                            {authMode === 'signup' && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 px-4 bg-blue-950 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-950 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    authMode === 'login' ? 'Sign In' : 'Create Account'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center space-y-4">
                             <p className="text-sm text-gray-600">
                                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => {
                                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                                        setError('');
                                    }}
                                    className="ml-2 font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                                >
                                    {authMode === 'login' ? "Sign up now" : "Log in"}
                                </button>
                            </p>
                        </div>
                        
                        <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center">
                            <button
                                onClick={() => setShowConfig(true)}
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
                            >
                                <LockClosedIcon className="w-3 h-3" />
                                Server Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Server Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <button 
                            onClick={() => setShowConfig(false)}
                            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Server Configuration</h3>
                            <p className="text-sm text-gray-500 mt-1">Connect your frontend to your Google Apps Script backend.</p>
                        </div>

                        <form onSubmit={handleConfigSave}>
                             <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Web App URL</label>
                                <input
                                    type="url"
                                    value={apiUrlInput}
                                    onChange={(e) => setApiUrlInput(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="https://script.google.com/macros/s/..."
                                    autoFocus
                                />
                            </div>
                            <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 mb-6 border border-blue-100">
                                <strong>Note:</strong> Ensure you have deployed your script as a Web App with access set to "Anyone".
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfig(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md hover:bg-blue-900 transition-colors"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthScreen;
