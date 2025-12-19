import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
    return (
        <div>
            <div className="flex items-center mb-6">
                <SettingsIcon className="w-8 h-8 text-indigo-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-gray-600">Settings page coming soon...</p>
            </div>
        </div>
    );
};

export default Settings;
