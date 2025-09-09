import { useState, useEffect } from 'react';
import { Folder, IconName } from '../types';
import Modal from './common/Modal';
import { FOLDER_COLORS, FOLDER_ICONS } from './Icons';
import { useTranslation } from 'react-i18next';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, icon: IconName) => void;
  folderToEdit?: Folder | null;
}

const AddFolderModal = ({ isOpen, onClose, onSave, folderToEdit }: AddFolderModalProps) => {
    const { t } = useTranslation(['tabs', 'common']);
    const [name, setName] = useState('');
    const [color, setColor] = useState(FOLDER_COLORS[8]);
    const [icon, setIcon] = useState<IconName>('default');

    useEffect(() => {
        if (isOpen) {
            if (folderToEdit) {
                setName(folderToEdit.name);
                setColor(folderToEdit.color);
                setIcon(folderToEdit.icon);
            } else {
                setName('New Folder');
                setColor(FOLDER_COLORS[8]);
                setIcon('default');
            }
        }
    }, [isOpen, folderToEdit]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), color, icon);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={folderToEdit ? t('modals.editFolderTitle') : t('modals.addFolderTitle')}>
            <div className="my-4 space-y-4">
                <div>
                    <label htmlFor="folder-name" className="form__label">{t('modals.folderNameLabel')}</label>
                    <input
                        type="text"
                        id="folder-name"
                        className="form__input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>
                <div>
                    <label className="form__label">{t('modals.colorLabel')}</label>
                    <div className="grid grid-cols-6 gap-2">
                        {FOLDER_COLORS.map(c => (
                            <button
                                key={c}
                                className={`h-8 w-8 rounded-full border-2 transition ${color === c ? 'border-indigo-500' : 'border-transparent hover:border-gray-400'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <label className="form__label">{t('modals.iconLabel')}</label>
                     <div className="grid grid-cols-6 gap-2">
                        {FOLDER_ICONS.map(i => (
                            <button
                                key={i.name}
                                className={`flex items-center justify-center h-8 w-8 rounded-full transition ${icon === i.name ? 'bg-indigo-500 text-white' : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600'}`}
                                onClick={() => setIcon(i.name)}
                            >
                                <i.component />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>{t('common:cancel')}</button>
                <button className="button button--primary" onClick={handleSave}>{t('modals.saveFolderBtn')}</button>
            </div>
        </Modal>
    );
};

export default AddFolderModal;