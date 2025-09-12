import { useState, useMemo } from 'react';
import { Parent, Uma, ManualParentData, BlueSpark, Grandparent, Skill } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { useTranslation } from 'react-i18next';
import './SelectGrandparentModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];
const STAR_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

const initialManualGpState: ManualParentData = {
    umaId: undefined, blueSpark: { type: 'Speed', stars: 1 },
    pinkSpark: { type: 'Turf', stars: 1 }, uniqueSparks: [],
};

interface SelectGrandparentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Grandparent) => void;
    title: string;
}

const SelectGrandparentModal = ({ isOpen, onClose, onSave, title }: SelectGrandparentModalProps) => {
    const { t } = useTranslation(['modals', 'game']);
    const { masterUmaList, masterSkillList, appData, activeServer, dataDisplayLanguage, umaMapById } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [selectionType, setSelectionType] = useState<'inventory' | 'manual'>('inventory');
    const [selectedInventoryParent, setSelectedInventoryParent] = useState<Parent | null>(null);
    const [manualData, setManualData] = useState<ManualParentData>(initialManualGpState);
    const [manualUnique, setManualUnique] = useState<Skill | null>(null);

    const inventory = useMemo(() => appData.inventory.filter(p => p.server === activeServer), [appData.inventory, activeServer]);
    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.type === 'unique'), [masterSkillList]);

    const getDisplayName = (id: string) => umaMapById.get(id)?.[displayNameProp] || id;

    const previewData = useMemo(() => {
        if (selectionType === 'inventory' && selectedInventoryParent) {
            const uma = umaMapById.get(selectedInventoryParent.umaId);
            return { image: uma?.image, name: getDisplayName(selectedInventoryParent.umaId), type: `Gen ${selectedInventoryParent.gen}` };
        }
        if (selectionType === 'manual' && manualData.umaId) {
            const uma = umaMapById.get(manualData.umaId);
            return { image: uma?.image, name: getDisplayName(manualData.umaId), type: t('enterManually') };
        }
        return null;
    }, [selectionType, selectedInventoryParent, manualData, umaMapById, getDisplayName, t]);

    const handleSave = () => {
        if (selectionType === 'inventory' && selectedInventoryParent) {
            onSave(selectedInventoryParent.id);
        } else if (selectionType === 'manual' && manualData.umaId) {
            onSave(manualData);
        }
        onClose();
    };

    const isSaveDisabled = (selectionType === 'inventory' && !selectedInventoryParent) || (selectionType === 'manual' && !manualData.umaId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <div className="gp-modal__preview">
                {previewData?.image ? (
                    <img src={`${import.meta.env.BASE_URL}${previewData.image}`} alt={previewData.name} className="gp-modal__preview-image" />
                ) : (
                    <div className="gp-modal__preview-placeholder"><FontAwesomeIcon icon={faUser} size="2x" /></div>
                )}
                <div>
                    <h4 className="gp-modal__preview-name">{previewData?.name || t('notSelected')}</h4>
                    <p className="gp-modal__preview-type">{previewData?.type}</p>
                </div>
            </div>

            <div className="gp-selector__toggle">
                <button type="button" className={`gp-selector__toggle-btn ${selectionType === 'inventory' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setSelectionType('inventory')}>{t('selectFromInventory')}</button>
                <button type="button" className={`gp-selector__toggle-btn ${selectionType === 'manual' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setSelectionType('manual')}>{t('enterManually')}</button>
            </div>

            {selectionType === 'inventory' ? (
                <SearchableSelect items={inventory.map(p => ({...p, name_en: getDisplayName(p.umaId), name_jp: getDisplayName(p.umaId)}))} placeholder={t('selectParentPlaceholder')} value={selectedInventoryParent ? getDisplayName(selectedInventoryParent.umaId) : null} onSelect={(item) => setSelectedInventoryParent(item as unknown as Parent)} displayProp={displayNameProp} />
            ) : (
                <div className="gp-selector__manual-card">
                    <SearchableSelect items={masterUmaList} placeholder={t('selectUmaPlaceholder')} value={manualData.umaId ? getDisplayName(manualData.umaId) : null} onSelect={(item) => setManualData(p => ({...p, umaId: (item as Uma).id}))} displayProp={displayNameProp} />
                    <div className="grid grid-cols-2 gap-2">
                        <select className="form__input" value={manualData.blueSpark.type} onChange={e => setManualData(p => ({...p, blueSpark: {...p.blueSpark, type: e.target.value as BlueSpark['type']}}))}>
                            {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                        </select>
                         <select className="form__input" value={manualData.blueSpark.stars} onChange={e => setManualData(p => ({...p, blueSpark: {...p.blueSpark, stars: Number(e.target.value) as 1|2|3}}))}>
                            {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <select className="form__input" value={manualData.pinkSpark.type} onChange={e => setManualData(p => ({...p, pinkSpark: {...p.pinkSpark, type: e.target.value}}))}>
                            {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                        </select>
                         <select className="form__input" value={manualData.pinkSpark.stars} onChange={e => setManualData(p => ({...p, pinkSpark: {...p.pinkSpark, stars: Number(e.target.value) as 1|2|3}}))}>
                            {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <SearchableSelect items={uniqueSkills} placeholder={t('searchUniqueSkill')} value={manualUnique?.[displayNameProp] || null} onSelect={(item) => { const skill = item as Skill; setManualUnique(skill); setManualData(p => ({...p, uniqueSparks: skill ? [{name: skill.name_en, stars: 3}] : []})); }} displayProp={displayNameProp} />
                </div>
            )}

            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>{t('common:cancel')}</button>
                <button className="button button--primary" onClick={handleSave} disabled={isSaveDisabled}>{t('confirmSelectionBtn')}</button>
            </div>
        </Modal>
    );
};

export default SelectGrandparentModal;