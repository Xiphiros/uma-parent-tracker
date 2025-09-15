import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, Uma } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import './BreedingPlannerModal.css';
import SelectionSlot from './common/SelectionSlot';
import InventoryModal from './InventoryModal';
import SelectUmaModal from './SelectUmaModal';
import LineageDisplay from './common/LineageDisplay';
import { calculateFullAffinity, getLineageCharacterIds, countUniqueInheritableSkills } from '../utils/affinity';
import SuggestionParentCard from './common/SuggestionParentCard';

interface BreedingPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PlannerTab = 'manual' | 'suggestions';
type ActiveSlot = 'parent1' | 'parent2' | null;

const BreedingPlannerModal = ({ isOpen, onClose }: BreedingPlannerModalProps) => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, dataDisplayLanguage, umaMapById, masterUmaList, appData, charaRelations, relationPoints } = useAppContext();
    const roster = getScoredRoster();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const [activeTab, setActiveTab] = useState<PlannerTab>('manual');
    const [excludeInbreeding, setExcludeInbreeding] = useState(true);
    
    // Modals state
    const [isInventoryModalOpen, setInventoryModalOpen] = useState(false);
    const [isUmaModalOpen, setUmaModalOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);

    // Manual Pair State
    const [manualParent1, setManualParent1] = useState<Parent | null>(null);
    const [manualParent2, setManualParent2] = useState<Parent | null>(null);

    // Suggestions State
    const [trainee, setTrainee] = useState<Uma | null>(null);

    const getDisplayName = (umaId: string) => umaMapById.get(umaId)?.[displayNameProp] || 'Unknown';
    
    const traineeSuggestionsForManualPair = useMemo(() => {
        if (!manualParent1 || !manualParent2) return [];
        
        let potentialTrainees = masterUmaList;
        if (excludeInbreeding) {
            const lineageIds = getLineageCharacterIds(manualParent1, manualParent2, inventoryMap, umaMapById);
            const lineageCharIdStrings = new Set(Array.from(lineageIds).map(String));
            potentialTrainees = masterUmaList.filter(uma => !lineageCharIdStrings.has(uma.characterId));
        }

        return potentialTrainees.map(tUma => ({
            uma: tUma,
            totalAffinity: calculateFullAffinity(tUma, manualParent1, manualParent2, charaRelations, relationPoints, inventoryMap, umaMapById)
        })).sort((a,b) => b.totalAffinity - a.totalAffinity).slice(0, 10);

    }, [manualParent1, manualParent2, masterUmaList, inventoryMap, umaMapById, charaRelations, relationPoints, excludeInbreeding]);

    const suggestions = useMemo(() => {
        if (!trainee || roster.length < 2) return [];
        const pairs = [];
        for (let i = 0; i < roster.length; i++) {
            for (let j = i + 1; j < roster.length; j++) {
                const p1 = roster[i];
                const p2 = roster[j];

                // Prevent suggesting a character as its own parent
                const p1CharId = umaMapById.get(p1.umaId)?.characterId;
                const p2CharId = umaMapById.get(p2.umaId)?.characterId;
                if (p1CharId === trainee.characterId || p2CharId === trainee.characterId) {
                    continue;
                }

                const totalAffinity = calculateFullAffinity(trainee, p1, p2, charaRelations, relationPoints, inventoryMap, umaMapById);
                const totalInheritableSkills = countUniqueInheritableSkills(p1, p2, inventoryMap);
                pairs.push({ p1, p2, totalAffinity, totalInheritableSkills });
            }
        }
        return pairs.sort((a, b) => {
            if (b.totalAffinity !== a.totalAffinity) return b.totalAffinity - a.totalAffinity;
            return b.totalInheritableSkills - a.totalInheritableSkills;
        }).slice(0, 10);
    }, [trainee, roster, inventoryMap, umaMapById, charaRelations, relationPoints]);
    
    const handleSelectParent = (parent: Parent) => {
        if (activeSlot === 'parent1') {
            if (parent.id === manualParent2?.id) setManualParent2(null);
            setManualParent1(parent);
        }
        if (activeSlot === 'parent2') {
             if (parent.id === manualParent1?.id) setManualParent1(null);
            setManualParent2(parent);
        }
        setInventoryModalOpen(false);
        setActiveSlot(null);
    };

    const handleSelectUma = (uma: Uma) => {
        setTrainee(uma);
        setUmaModalOpen(false);
    };
    
    const renderAvatar = (umaId: string) => {
        const uma = umaMapById.get(umaId);
        return <img src={`${import.meta.env.BASE_URL}${uma?.image}`} alt={getDisplayName(umaId)} className="breeding-planner__suggestion-avatar" />;
    };

    const getSelectedItem = (item: Uma | null) => {
        if (!item) return null;
        return { name: item[displayNameProp], image: item.image || null };
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.title')} size="xl">
                <div className="breeding-planner__tabs">
                    <button className={`breeding-planner__tab ${activeTab === 'manual' ? 'breeding-planner__tab--active' : ''}`} onClick={() => setActiveTab('manual')}>{t('breedingPlanner.manualPair')}</button>
                    <button className={`breeding-planner__tab ${activeTab === 'suggestions' ? 'breeding-planner__tab--active' : ''}`} onClick={() => setActiveTab('suggestions')}>{t('breedingPlanner.traineeSuggestions')}</button>
                </div>

                <div className="breeding-planner__content">
                    {activeTab === 'manual' && (
                        <div className="breeding-planner__manual-view">
                            <div className="breeding-planner__pair-selector">
                                <LineageDisplay label={t('breedingPlanner.selectParent1')} parent={manualParent1} onClick={() => { setInventoryModalOpen(true); setActiveSlot('parent1'); }} onClear={() => setManualParent1(null)} />
                                <span className="breeding-planner__pair-selector-plus">+</span>
                                <LineageDisplay label={t('breedingPlanner.selectParent2')} parent={manualParent2} onClick={() => { setInventoryModalOpen(true); setActiveSlot('parent2'); }} onClear={() => setManualParent2(null)} />
                            </div>
                            {manualParent1 && manualParent2 && (
                                <div className="breeding-planner__results-container">
                                    <div className="breeding-planner__inbreeding-toggle">
                                        <input type="checkbox" id="inbreeding-toggle" checked={excludeInbreeding} onChange={e => setExcludeInbreeding(e.target.checked)} />
                                        <label htmlFor="inbreeding-toggle">{t('breedingPlanner.excludeInbreeding')}</label>
                                    </div>
                                    <div className="breeding-planner__suggestions-list mt-2">
                                        <h4 className="form__section-title text-center mb-2">{t('breedingPlanner.bestTrainees')}</h4>
                                        {traineeSuggestionsForManualPair.map((s, index) => (
                                             <div key={s.uma.id} className="breeding-planner__suggestion-item">
                                                <div className="breeding-planner__suggestion-rank">#{index + 1}</div>
                                                <div className="breeding-planner__suggestion-pair">
                                                    {renderAvatar(s.uma.id)}
                                                    <span>{s.uma[displayNameProp]}</span>
                                                </div>
                                                <div className="breeding-planner__suggestion-scores">
                                                    <div className="breeding-planner__suggestion-affinity">{s.totalAffinity} {t('breedingPlanner.totalAffinity')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'suggestions' && (
                         <div className="breeding-planner__suggestions-view">
                            <SelectionSlot label={t('breedingPlanner.selectTrainee')} selectedItem={getSelectedItem(trainee)} onClick={() => setUmaModalOpen(true)} onClear={() => setTrainee(null)} />
                            
                            {trainee && (
                                <div className="breeding-planner__suggestions-list mt-4">
                                    {suggestions.length > 0 ? suggestions.map((s, index) => (
                                        <div key={`${s.p1.id}-${s.p2.id}`} className="breeding-planner__suggestion-item">
                                            <div className="breeding-planner__suggestion-rank">#{index + 1}</div>
                                            <div className="breeding-planner__suggestion-pair-cards">
                                                <SuggestionParentCard parent={s.p1} />
                                                <SuggestionParentCard parent={s.p2} />
                                            </div>
                                            <div className="breeding-planner__suggestion-scores">
                                                <div className="breeding-planner__suggestion-affinity">{s.totalAffinity} {t('breedingPlanner.affinity')}</div>
                                                <div className="breeding-planner__suggestion-parent-score">{s.totalInheritableSkills} {t('breedingPlanner.totalSkills')}</div>
                                            </div>
                                        </div>
                                    )) : <p className="card__placeholder-text text-center py-8">{t('breedingPlanner.noResults')}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setInventoryModalOpen(false)} isSelectionMode onSelectParent={handleSelectParent} />
            <SelectUmaModal isOpen={isUmaModalOpen} onClose={() => setUmaModalOpen(false)} onSelect={handleSelectUma} />
        </>
    );
};

export default BreedingPlannerModal;