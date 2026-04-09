
import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { XMarkIcon } from './icons';

interface UserProfileProps {
    onSave: (profile: UserProfileType) => void;
    onCancel: () => void;
    currentProfile: UserProfileType | null;
    isInitialSetup?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ onSave, onCancel, currentProfile, isInitialSetup }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Mother' | 'Father' | ''>('');
    const [children, setChildren] = useState<string[]>(['']);

    useEffect(() => {
        if (currentProfile) {
            setName(currentProfile.name || '');
            setRole(currentProfile.role || '');
            setChildren(currentProfile.children.length > 0 ? currentProfile.children : ['']);
        }
    }, [currentProfile]);

    const handleChildChange = (index: number, value: string) => {
        const newChildren = [...children];
        newChildren[index] = value;
        setChildren(newChildren);
    };

    const addChildInput = () => {
        setChildren([...children, '']);
    };

    const removeChildInput = (index: number) => {
        if (children.length > 1) {
            const newChildren = children.filter((_, i) => i !== index);
            setChildren(newChildren);
        } else {
            setChildren(['']);
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert("Please enter your name to continue.");
            return;
        }
        if (!role) {
            alert("Please select your role (Mother or Father) to continue.");
            return;
        }

        const profileData: UserProfileType = {
            name,
            role,
            children: children.filter(c => c.trim() !== ''),
        };
        onSave(profileData);
    };

    return (
        <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-lg shadow-sm max-w-2xl mx-auto">
             {isInitialSetup ? (
                <>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Your Profile</h1>
                    <p className="mt-2 text-base text-gray-700">This basic information helps the AI understand the context of your situation. It's stored securely in your private database.</p>
                </>
            ) : (
                <>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Profile</h1>
                    <p className="mt-2 text-base text-gray-700">This information helps the AI understand context about who is involved in the incidents.</p>
                </>
            )}

            <div className="mt-8 space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        placeholder="e.g., Jane Doe"
                    />
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">Your Role</label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'Mother' | 'Father' | '')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">-- Select Role --</option>
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Children's Names</label>
                    <div className="space-y-3 mt-1">
                        {children.map((child, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={child}
                                    onChange={(e) => handleChildChange(index, e.target.value)}
                                    className="block w-full px-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    placeholder={`Child ${index + 1} Name`}
                                />
                                <button
                                    onClick={() => removeChildInput(index)}
                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                                    aria-label="Remove child"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={addChildInput}
                        className="mt-3 px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                        + Add Child
                    </button>
                </div>
            </div>

            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-3">
                {!isInitialSetup && (
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {isInitialSetup ? 'Save and Continue' : 'Save Profile'}
                </button>
            </div>
        </div>
    );
};

export default UserProfile;
