import React, { useState, useMemo } from 'react';
import { Report } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from './icons';
import IncidentCard from './IncidentCard';

interface CalendarViewProps {
    reports: Report[];
    onDiscussIncident: (reportId: string) => void;
    onAnalyzeIncident: (reportId: string) => void;
    selectedReportIds: Set<string>;
    onToggleReportSelection: (reportId: string) => void;
    onDayClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ reports, onDiscussIncident, onAnalyzeIncident, selectedReportIds, onToggleReportSelection, onDayClick }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const reportsByDate = useMemo(() => {
        const map = new Map<string, Report[]>();
        reports.forEach(report => {
            const dateKey = new Date(report.createdAt).toISOString().split('T')[0];
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(report);
        });
        return map;
    }, [reports]);

    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));
    const placeholders = Array.from({ length: startDayOfWeek });

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
        setSelectedDate(null); // Clear selection when changing month
    };

    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const selectedDayReports = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = selectedDate.toISOString().split('T')[0];
        const sortedReports = (reportsByDate.get(dateKey) || []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return sortedReports;
    }, [selectedDate, reportsByDate]);
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Calendar View</h1>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors" aria-label="Previous month">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="text-xl font-semibold text-gray-900">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors" aria-label="Next month">
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 font-medium border-b border-gray-200 pb-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {placeholders.map((_, index) => <div key={`placeholder-${index}`} />)}
                    {dates.map((date, index) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const incidentsOnDay = reportsByDate.get(dateKey);
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());

                        return (
                            <div 
                                key={index} 
                                className="h-24 p-2 border border-transparent flex flex-col cursor-pointer rounded-lg transition-colors"
                                onClick={() => {
                                    if (incidentsOnDay) {
                                        setSelectedDate(date);
                                    } else {
                                        onDayClick(date);
                                    }
                                }}
                            >
                                <div
                                    className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                                        isSelected ? 'bg-blue-950 text-white' : isToday ? 'bg-gray-200 text-gray-900' : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="font-semibold text-sm">{date.getDate()}</span>
                                    {incidentsOnDay && !isSelected && (
                                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

             {selectedDate && (
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 tracking-tight mb-4">
                        Incidents for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h2>
                    {selectedDayReports.length > 0 ? (
                        <div className="space-y-6">
                            {selectedDayReports.map(report => (
                                <IncidentCard
                                    key={report.id}
                                    report={report}
                                    onDiscuss={onDiscussIncident}
                                    onAnalyze={onAnalyzeIncident}
                                    isSelected={selectedReportIds.has(report.id)}
                                    onSelect={onToggleReportSelection}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Incidents</h3>
                            <p className="mt-1 text-sm text-gray-500">There are no incidents logged for this day.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalendarView;
