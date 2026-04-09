
import React, { useState, useRef, useEffect } from 'react';
import { BookOpenIcon, UserCircleIcon, MenuIcon, SparklesIcon } from './icons';

interface HeaderProps {
    onMenuClick: () => void;
    onProfileClick: () => void;
    onAgentClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onProfileClick, onAgentClick }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-blue-950 border-b border-blue-800 fixed top-0 left-0 right-0 z-20 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <button 
                            onClick={onMenuClick} 
                            className="mr-2 p-2 rounded-full text-gray-300 hover:bg-blue-900 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white" 
                            aria-label="Open menu"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <div className="flex items-center">
                           <BookOpenIcon className="h-8 w-8 text-white" />
                           <div className="ml-3 flex flex-col">
                                <span className="text-xl font-semibold text-white tracking-tight leading-none">
                                    CustodyX<span className="text-blue-400 font-medium">.ai</span>
                                </span>
                                <span className="text-[0.65rem] text-blue-200 uppercase tracking-wider leading-none mt-0.5">
                                    An R² Technologies Project
                                </span>
                           </div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                className="p-2 rounded-full text-gray-300 hover:bg-blue-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                aria-label="Open user menu"
                                aria-haspopup="true"
                                aria-expanded={isDropdownOpen}
                            >
                                <UserCircleIcon className="h-7 w-7" />
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabIndex={-1}>
                                    <button
                                        onClick={() => {
                                            onProfileClick();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                        tabIndex={-1}
                                    >
                                        <UserCircleIcon className="w-5 h-5 text-gray-500"/>
                                        <span>My Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onAgentClick();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                        tabIndex={-1}
                                    >
                                        <SparklesIcon className="w-5 h-5 text-gray-500"/>
                                        <span>AI Agent</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
