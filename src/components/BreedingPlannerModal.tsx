import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, Uma, ManualParentData, BlueSpark, PinkSpark } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import './BreedingPlannerModal.css';
import SelectionSlot from './common/SelectionSlot';
import InventoryModal from './InventoryModal';
import SelectUmaModal from './SelectUmaModal';
import LineageDisplay from './common/LineageDisplay';
import { calculateFullAffinity, getLineageCharacterIds, countUniqueInheritableSkills, resolveGrandparent } from '../utils/affinity';
import PlaceholderCard from './common/PlaceholderCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faUser, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import SparkTag from './common/SparkTag';

interface BreedingPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Suggestion {
    p1: Parent;
    p2: Parent;
    totalAffinity: number;
    totalInheritableSkills: number;
}

type PlannerTab = 'manual' | 'suggestions';
type ActiveSlot = 'parent1' | 'parent2' | null;

const BreedingPlannerModal = ({ isOpen, onClose }: BreedingPlannerModalProps) => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, dataDisplayLanguage, umaMapById, masterUmaList, appData, charaRelations, relationPoints, skillMapByName, getActiveProfile } = useAppContext();
    const roster = useMemo(() => getScoredRoster(), [getScoredRoster]);
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);
    const goal = getActiveProfile()?.goal;

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
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [isSparkViewExpanded, setIsSparkViewExpanded] = useState(false);

    const getDisplayName = (umaId: string) => umaMapById.get(umaId)?.[displayNameProp] || 'Unknown';
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    
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

    const suggestions = useMemo<Suggestion[]>(() => {
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
        }).slice(0, 20);
    }, [trainee, roster, inventoryMap, umaMapById, charaRelations, relationPoints]);

    const aggregatedSparksForSelected = useMemo(() => {
        if (!selectedSuggestion) return null;
        const { p1, p2 } = selectedSuggestion;
        const gp1_1 = resolveGrandparent(p1.grandparent1, inventoryMap);
        const gp1_2 = resolveGrandparent(p1.grandparent2, inventoryMap);
        const gp2_1 = resolveGrandparent(p2.grandparent1, inventoryMap);
        const gp2_2 = resolveGrandparent(p2.grandparent2, inventoryMap);

        const blue: { [key: string]: { total: number, parent: number } } = {};
        const pink: { [key: string]: { total: number, parent: number } } = {};

        const processSpark = (map: typeof blue, spark: BlueSpark | PinkSpark, isParent: boolean) => {
            if (!map[spark.type]) map[spark.type] = { total: 0, parent: 0 };
            map[spark.type].total += spark.stars;
            if (isParent) map[spark.type].parent += spark.stars;
        };

        [p1, p2].forEach(p => {
            processSpark(blue, p.blueSpark, true);
            processSpark(pink, p.pinkSpark, true);
        });
        [gp1_1, gp1_2, gp2_1, gp2_2].forEach(gp => {
            if (gp) {
                processSpark(blue, gp.blueSpark, false);
                processSpark(pink, gp.pinkSpark, false);
            }
        });

        const unique: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = [];
        const skillNames = new Set<string>();

        const addSparks = (member: Parent | ManualParentData | null, isParent: boolean, type: 'unique' | 'white') => {
            if (!member) return;
            const sparks = type === 'unique' ? member.uniqueSparks : ('whiteSparks' in member ? member.whiteSparks : []);
            const targetList = type === 'unique' ? unique : white;

            sparks.forEach(spark => {
                if (!skillNames.has(spark.name)) {
                    targetList.push({ ...spark, fromParent: isParent });
                    skillNames.add(spark.name);
                }
            });
        };
        
        addSparks(p1, true, 'unique'); addSparks(p2, true, 'unique');
        addSparks(gp1_1, false, 'unique'); addSparks(gp1_2, false, 'unique');
        addSparks(gp2_1, false, 'unique'); addSparks(gp2_2, false, 'unique');

        const white: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = [];
        addSparks(p1, true, 'white'); addSparks(p2, true, 'white');
        addSparks(gp1_1, false, 'white'); addSparks(gp1_2, false, 'white');
        addSparks(gp2_1, false, 'white'); addSparks(gp2_2, false, 'white');

        return { blue, pink, unique, white };
    }, [selectedSuggestion, inventoryMap]);

    useEffect(() => {
        if (suggestions.length > 0) {
            setSelectedSuggestion(suggestions[0]);
        } else {
            setSelectedSuggestion(null);
        }
        setIsSparkViewExpanded(false);
    }, [suggestions]);
    
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

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setIsSparkViewExpanded(false);
    };

    const excludedPlannerCharacterIds = useMemo(() => {
        const ids = new Set<string>();
        let parentToCheck: Parent | null = null;

        if (activeSlot === 'parent1') parentToCheck = manualParent2;
        if (activeSlot === 'parent2') parentToCheck = manualParent1;

        if (parentToCheck) {
            const charId = umaMapById.get(parentToCheck.umaId)?.characterId;
            if (charId) ids.add(charId);
        }
        return ids;
    }, [activeSlot, manualParent1, manualParent2, umaMapById]);

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
                                <div className="breeding-planner__suggestions-grid mt-4">
                                    <div className="breeding-planner__suggestions-list">
                                        {suggestions.length > 0 ? suggestions.map((s, index) => (
                                            <div 
                                                key={`${s.p1.id}-${s.p2.id}`} 
                                                role="button"
                                                tabIndex={0}
                                                className={`breeding-planner__suggestion-item ${selectedSuggestion?.p1.id === s.p1.id && selectedSuggestion?.p2.id === s.p2.id ? 'breeding-planner__suggestion-item--selected' : ''}`}
                                                onClick={() => handleSelectSuggestion(s)}
                                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectSuggestion(s)}
                                            >
                                                <div className="breeding-planner__suggestion-rank">#{index + 1}</div>
                                                <div className="breeding-planner__suggestion-pair">
                                                    {renderAvatar(s.p1.umaId)}
                                                    {renderAvatar(s.p2.umaId)}
                                                </div>
                                                <div className="breeding-planner__suggestion-scores">
                                                    <div className="breeding-planner__suggestion-affinity">{s.totalAffinity} {t('breedingPlanner.affinity')}</div>
                                                    <div className="breeding-planner__suggestion-parent-score">{s.totalInheritableSkills} {t('breedingPlanner.totalSkills')}</div>
                                                </div>
                                            </div>
                                        )) : <p className="card__placeholder-text text-center py-8">{t('breedingPlanner.noResults')}</p>}
                                    </div>
                                    <div className="breeding-planner__suggestion-detail">
                                        {selectedSuggestion && aggregatedSparksForSelected ? (
                                            <>
                                                <button className="breeding-planner__expand-btn" onClick={() => setIsSparkViewExpanded(prev => !prev)}>
                                                    <FontAwesomeIcon icon={isSparkViewExpanded ? faChevronDown : faChevronUp} />
                                                </button>
                                                <div className="breeding-planner__detail-lineage">
                                                    <LineageDisplay label="" parent={selectedSuggestion.p1} />
                                                    <span className="breeding-planner__pair-selector-plus">+</span>
                                                    <LineageDisplay label="" parent={selectedSuggestion.p2} />
                                                </div>
                                                <div className="breeding-planner__detail-summary">
                                                    <div>
                                                        <span className="breeding-planner__detail-summary-value">{selectedSuggestion.totalAffinity}</span>
                                                        <span className="breeding-planner__detail-summary-label">{t('breedingPlanner.affinity')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="breeding-planner__detail-summary-value">{selectedSuggestion.totalInheritableSkills}</span>
                                                        <span className="breeding-planner__detail-summary-label">{t('breedingPlanner.totalSkills')}</span>
                                                    </div>
                                                </div>
                                                <div className={`breeding-planner__detail-sparks ${isSparkViewExpanded ? 'breeding-planner__detail-sparks--expanded' : ''}`}>
                                                    <div className="breeding-planner__detail-sparks-content">
                                                        {Object.entries(aggregatedSparksForSelected.blue).map(([type, data]) => (
                                                            <div key={type} className="lineage-spark" data-spark-category="blue" data-spark-type={type.toLowerCase()}>
                                                                {data.total}★ {t(type, { ns: 'game' })}
                                                                {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                                            </div>
                                                        ))}
                                                        {Object.entries(aggregatedSparksForSelected.pink).map(([type, data]) => (
                                                            <div key={type} className="lineage-spark" data-spark-category="pink" data-spark-type={type.toLowerCase().replace(/ /g, '-')}>
                                                                {data.total}★ {t(type, { ns: 'game' })}
                                                                {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                                            </div>
                                                        ))}
                                                        {aggregatedSparksForSelected.unique.map(spark => (
                                                            <SparkTag key={spark.name} category="unique" type={getSkillDisplayName(spark.name)} stars={spark.stars}>
                                                                {spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                                            </SparkTag>
                                                        ))}
                                                        {aggregatedSparksForSelected.white.map(spark => {
                                                            const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                                                            const tier = wishlistItem ? `(${t('parentCard.rank')} ${wishlistItem.tier})` : null;
                                                            return (
                                                                <SparkTag key={spark.name} category="white" type={getSkillDisplayName(spark.name)} stars={spark.stars}>
                                                                    {spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                                                    {tier && <span className="parent-card__spark-tier">{tier}</span>}
                                                                </SparkTag>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <PlaceholderCard 
                                                icon={<FontAwesomeIcon icon={faUsers} size="2x" />}
                                                title={t('breedingPlanner.noResults')}
                                                message={t('breedingPlanner.noResultsMessage')}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setInventoryModalOpen(false)} isSelectionMode onSelectParent={handleSelectParent} excludedCharacterIds={excludedPlannerCharacterIds} />
            <SelectUmaModal isOpen={isUmaModalOpen} onClose={() => setUmaModalOpen(false)} onSelect={handleSelectUma} />
        </>
    );
};

export default BreedingPlannerModal;