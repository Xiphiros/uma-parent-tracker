import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, Uma } from '../types';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { useTranslation } from 'react-i18next';
import './BreedingPlannerModal.css';

interface BreedingPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PlannerTab = 'manual' | 'suggestions';

const BreedingPlannerModal = ({ isOpen, onClose }: BreedingPlannerModalProps) => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, dataDisplayLanguage, umaMapById, affinityData, masterUmaList } = useAppContext();
    const roster = getScoredRoster();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [activeTab, setActiveTab] = useState<PlannerTab>('manual');

    // Manual Pair State
    const [manualParent1, setManualParent1] = useState<Parent | null>(null);
    const [manualParent2, setManualParent2] = useState<Parent | null>(null);

    // Suggestions State
    const [trainee, setTrainee] = useState<Uma | null>(null);

    const getDisplayName = (umaId: string) => umaMapById.get(umaId)?.[displayNameProp] || 'Unknown';

    const selectableRoster = useMemo(() => {
        return roster.map(parent => {
            const uma = umaMapById.get(parent.umaId);
            return {
                ...parent,
                name_en: uma ? uma[displayNameProp] : parent.name,
                name_jp: uma ? uma.name_jp : parent.name,
            };
        });
    }, [roster, umaMapById, displayNameProp]);

    const manualAffinityScore = useMemo(() => {
        if (!manualParent1 || !manualParent2 || !affinityData) return 0;
        const char1 = umaMapById.get(manualParent1.umaId);
        const char2 = umaMapById.get(manualParent2.umaId);
        if (!char1 || !char2) return 0;
        return affinityData[char1.characterId]?.[char2.characterId] ?? 0;
    }, [manualParent1, manualParent2, affinityData, umaMapById]);

    const suggestions = useMemo(() => {
        if (!trainee || roster.length < 2 || !affinityData) return [];

        const traineeCharId = trainee.characterId;
        const traineeAffinity = affinityData[traineeCharId];
        if (!traineeAffinity) return [];

        const pairs = [];
        for (let i = 0; i < roster.length; i++) {
            for (let j = i + 1; j < roster.length; j++) {
                const p1 = roster[i];
                const p2 = roster[j];
                const p1Char = umaMapById.get(p1.umaId);
                const p2Char = umaMapById.get(p2.umaId);

                if (p1Char && p2Char) {
                    const affinityP1 = traineeAffinity[p1Char.characterId] ?? 0;
                    const affinityP2 = traineeAffinity[p2Char.characterId] ?? 0;
                    const affinityBetween = affinityData[p1Char.characterId]?.[p2Char.characterId] ?? 0;
                    const totalAffinity = affinityP1 + affinityP2 + affinityBetween;

                    pairs.push({ p1, p2, totalAffinity });
                }
            }
        }

        return pairs.sort((a, b) => b.totalAffinity - a.totalAffinity).slice(0, 10);
    }, [trainee, roster, affinityData, umaMapById]);
    
    const renderAvatar = (umaId: string) => {
        const uma = umaMapById.get(umaId);
        return <img src={`${import.meta.env.BASE_URL}${uma?.image}`} alt={getDisplayName(umaId)} className="breeding-planner__suggestion-avatar" />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.title')} size="xl">
            <div className="breeding-planner__tabs">
                <button className={`breeding-planner__tab ${activeTab === 'manual' ? 'breeding-planner__tab--active' : ''}`} onClick={() => setActiveTab('manual')}>{t('breedingPlanner.manualPair')}</button>
                <button className={`breeding-planner__tab ${activeTab === 'suggestions' ? 'breeding-planner__tab--active' : ''}`} onClick={() => setActiveTab('suggestions')}>{t('breedingPlanner.traineeSuggestions')}</button>
            </div>

            <div className="breeding-planner__content">
                {activeTab === 'manual' && (
                    <div>
                        <div className="breeding-planner__pair-selector">
                            <SearchableSelect items={selectableRoster} placeholder={t('breedingPlanner.selectParent1')} value={manualParent1 ? getDisplayName(manualParent1.umaId) : null} onSelect={(item) => setManualParent1(item as Parent)} displayProp={displayNameProp} />
                            <span className="breeding-planner__pair-selector-plus">+</span>
                            <SearchableSelect items={selectableRoster.filter(p => p.id !== manualParent1?.id)} placeholder={t('breedingPlanner.selectParent2')} value={manualParent2 ? getDisplayName(manualParent2.umaId) : null} onSelect={(item) => setManualParent2(item as Parent)} displayProp={displayNameProp} disabled={!manualParent1} />
                        </div>
                        {manualParent1 && manualParent2 && (
                            <div className="breeding-planner__results-card">
                                <h4 className="form__section-title">{t('breedingPlanner.directAffinity')}</h4>
                                <p className="breeding-planner__affinity-score"><span>{manualAffinityScore}</span> {t('parentCard.pts')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'suggestions' && (
                    <div>
                        <SearchableSelect items={masterUmaList} placeholder={t('breedingPlanner.selectTrainee')} value={trainee?.[displayNameProp] || null} onSelect={(item) => setTrainee(item as Uma)} displayProp={displayNameProp} />
                        
                        {trainee && (
                            <div className="breeding-planner__suggestions-list mt-4">
                                {suggestions.length > 0 ? suggestions.map((s, index) => (
                                    <div key={`${s.p1.id}-${s.p2.id}`} className="breeding-planner__suggestion-item">
                                        <div className="breeding-planner__suggestion-rank">#{index + 1}</div>
                                        <div>
                                            <div className="breeding-planner__suggestion-pair">
                                                {renderAvatar(s.p1.umaId)}
                                                <span>{getDisplayName(s.p1.umaId)}</span>
                                            </div>
                                             <div className="breeding-planner__suggestion-pair mt-2">
                                                {renderAvatar(s.p2.umaId)}
                                                <span>{getDisplayName(s.p2.umaId)}</span>
                                            </div>
                                        </div>
                                        <div className="breeding-planner__suggestion-scores">
                                            <div className="breeding-planner__suggestion-affinity">{s.totalAffinity} {t('breedingPlanner.affinity')}</div>
                                            <div className="breeding-planner__suggestion-parent-score">{s.p1.score} + {s.p2.score} {t('parentCard.pts')}</div>
                                        </div>
                                    </div>
                                )) : <p className="card__placeholder-text text-center py-8">{t('breedingPlanner.noResults')}</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BreedingPlannerModal;