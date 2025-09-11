import React from 'react';
import { IconName } from "../types";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFolder, faPersonRunning, faTrophy, faBookOpen, faStar, faHeart, 
    faBolt, faFire, faBrain, faCarrot, faHorseHead, faFlag 
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface FolderIcon {
    name: IconName;
    component: () => React.ReactElement;
}

const iconMap: Record<IconName, IconDefinition> = {
    default: faFolder,
    runner: faPersonRunning,
    trophy: faTrophy,
    book: faBookOpen,
    star: faStar,
    heart: faHeart,
    bolt: faBolt,
    flame: faFire,
    brain: faBrain,
    carrot: faCarrot,
    horseshoe: faHorseHead,
    flag: faFlag,
};

const createIconComponent = (icon: IconDefinition) => () => <FontAwesomeIcon icon={icon} />;

export const FOLDER_ICONS: FolderIcon[] = [
    { name: 'default', component: createIconComponent(iconMap.default) },
    { name: 'runner', component: createIconComponent(iconMap.runner) },
    { name: 'trophy', component: createIconComponent(iconMap.trophy) },
    { name: 'book', component: createIconComponent(iconMap.book) },
    { name: 'star', component: createIconComponent(iconMap.star) },
    { name: 'heart', component: createIconComponent(iconMap.heart) },
    { name: 'bolt', component: createIconComponent(iconMap.bolt) },
    { name: 'flame', component: createIconComponent(iconMap.flame) },
    { name: 'brain', component: createIconComponent(iconMap.brain) },
    { name: 'carrot', component: createIconComponent(iconMap.carrot) },
    { name: 'horseshoe', component: createIconComponent(iconMap.horseshoe) },
    { name: 'flag', component: createIconComponent(iconMap.flag) },
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
    return FOLDER_ICONS.find(i => i.name === name)?.component || createIconComponent(iconMap.default);
};