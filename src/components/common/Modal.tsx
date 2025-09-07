import { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'lg';
}

const Modal = ({ isOpen, onClose, title, children, size = 'sm' }: ModalProps) => {
  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null; // Should not happen if index.html is correct

  const sizeClass = size === 'lg' ? 'dialog-modal__content--lg' : 'dialog-modal__content--sm';

  return ReactDOM.createPortal(
    <div className="dialog-modal opacity-100" onClick={onClose}>
      <div className={`dialog-modal__content ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-modal__title">{title}</h3>
        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;