
import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { BookOpenIcon, CheckCircleIcon } from './icons';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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
                            {authMode === 'login' && (
                                <p className="text-xs text-gray-500">
                                    Need to configure your backend?{' '}
                                    <a
                                        href="https://docs.google.com/spreadsheets"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        Set up your Google Apps Script URL
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
