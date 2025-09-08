import React from 'react';
import { IconName } from "../types";

const iconStyles: React.CSSProperties = {
    height: '1rem',
    width: '1rem',
};

const DefaultIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const RunnerIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrophyIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>;
const BookIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const StarIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const HeartIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const BoltIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const FlameIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A5 5 0 0012 11c0-4-3-4-3-4" /></svg>;
const BrainIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CarrotIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.354 1.646a.5.5 0 01.646 0l8 8a.5.5 0 010 .708l-8 8a.5.5 0 01-.708-.708L18.293 10H1.5a.5.5 0 010-1h16.793L11.354 1.646z" transform="rotate(45 12 12)" /></svg>;
const HorseshoeIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 13.5 19.5 13.5c-1.657 0-3-1.343-3-3V6c0-3.314-2.686-6-6-6S4.5 2.686 4.5 6v4.5c0 1.657-1.343 3-3 3v0" /></svg>;
const FlagIcon = () => <svg style={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12z" /></svg>;


export const FOLDER_ICONS: { name: IconName, component: () => React.ReactElement }[] = [
    { name: 'default', component: DefaultIcon },
    { name: 'runner', component: RunnerIcon },
    { name: 'trophy', component: TrophyIcon },
    { name: 'book', component: BookIcon },
    { name: 'star', component: StarIcon },
    { name: 'heart', component: HeartIcon },
    { name: 'bolt', component: BoltIcon },
    { name: 'flame', component: FlameIcon },
    { name: 'brain', component: BrainIcon },
    { name: 'carrot', component: CarrotIcon },
    { name: 'horseshoe', component: HorseshoeIcon },
    { name: 'flag', component: FlagIcon },
];

export const FOLDER_COLORS = [
    '#6b7280', // gray-500
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
    '#a855f7', // purple-500
    '#6366f1', // indigo-500
    '#0ea5e9', // sky-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
];

export const getIcon = (name: IconName) => {
    return FOLDER_ICONS.find(i => i.name === name)?.component || DefaultIcon;
};