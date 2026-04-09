
import { Report, StoredDocument, IncidentTemplate, UserProfile, User, Message } from '../types';
import { API_URL as DEFAULT_API_URL } from '../constants/apiUrl';

let API_URL = DEFAULT_API_URL;

export const setApiUrl = (url: string) => {
    API_URL = url;
};

export const getApiUrl = () => API_URL;

const request = async (action: string, data: any = {}) => {
    if (!API_URL) throw new Error('API URL not configured');
    
    // GAS web apps usually take POST requests best for JSON payloads
    const response = await fetch(API_URL, {
        method: 'POST', 
        mode: 'cors',
        body: JSON.stringify({ action, ...data })
    });

    const result = await response.json();
    if (result.status === 'error') {
        throw new Error(result.message);
    }
    return result;
};

export const api = {
    login: async (email: string, password: string): Promise<User> => {
        const res = await request('login', { email, password });
        return { userId: res.userId, email: res.email };
    },

    signup: async (email: string, password: string): Promise<User> => {
        const res = await request('signup', { email, password });
        return { userId: res.userId, email: res.email };
    },

    syncData: async (userId: string) => {
        const res = await request('sync', { userId });
        return res.data;
    },

    saveReports: async (userId: string, reports: Report[]) => {
        return request('saveItems', { userId, type: 'reports', items: reports });
    },

    saveDocuments: async (userId: string, documents: StoredDocument[]) => {
        return request('saveItems', { userId, type: 'documents', items: documents });
    },

    saveTemplates: async (userId: string, templates: IncidentTemplate[]) => {
        return request('saveItems', { userId, type: 'templates', items: templates });
    },

    saveProfile: async (userId: string, profile: UserProfile) => {
        return request('saveItems', { userId, type: 'profile', items: [profile] });
    },

    deleteDocument: async (userId: string, documentId: string) => {
        return request('deleteItem', { userId, type: 'documents', itemId: documentId });
    },

    deleteTemplate: async (userId: string, templateId: string) => {
        return request('deleteItem', { userId, type: 'templates', itemId: templateId });
    },

    sendMessage: async (userId: string, content: string, role: 'user' | 'other') => {
        const res = await request('sendMessage', { userId, content, role });
        return res.message;
    },

    getMessages: async (userId: string, after?: string) => {
        const res = await request('getMessages', { userId, after });
        return res.messages as Message[];
    }
};
