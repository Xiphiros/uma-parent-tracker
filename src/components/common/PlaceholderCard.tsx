import React from 'react';
import './PlaceholderCard.css';

interface PlaceholderCardProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const PlaceholderCard = ({ icon, title, message, action }: PlaceholderCardProps) => {
    return (
        <div className="placeholder-card">
            <div className="placeholder-card__icon">{icon}</div>
            <h3 className="placeholder-card__title">{title}</h3>
            <p className="placeholder-card__message">{message}</p>
            {action && (
                <button className="button button--secondary" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default PlaceholderCard;