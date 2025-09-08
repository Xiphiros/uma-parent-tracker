import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useClickOutside } from '../../hooks/useClickOutside';
import './ContextMenu.css';

export interface MenuItem {
    label: string;
    onClick: () => void;
    isDestructive?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number, y: number };
    items: MenuItem[];
    onClose: () => void;
}

const ContextMenu = ({ isOpen, position, items, onClose }: ContextMenuProps) => {
    const menuRef = useClickOutside<HTMLDivElement>(onClose);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={{ top: position.y, left: position.x }}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    className={`context-menu__item ${item.isDestructive ? 'context-menu__item--destructive' : ''} ${item.disabled ? 'context-menu__item--disabled' : ''}`}
                    onClick={() => {
                        if (item.disabled) return;
                        item.onClick();
                        onClose();
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>,
        modalRoot
    );
};

export default ContextMenu;