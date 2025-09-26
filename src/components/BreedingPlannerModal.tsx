import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, Uma, ManualParentData, BlueSpark, PinkSpark, WhiteSpark } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import './BreedingPlannerModal.css';
import SelectionSlot from './common/SelectionSlot';
import InventoryModal from './InventoryModal';
import SelectUmaModal from './SelectUmaModal';
import LineageDisplay from './common/LineageDisplay';
import { calculateFullAffinity, getLineageCharacterIds, countTotalLineageWhiteSparks, countUniqueCombinedLineageWhiteSparks, resolveGrandparent, getMissingWishlistSkills, getUnsaturatedWishlistSkills } from '../utils/affinity';
import PlaceholderCard from './common/PlaceholderCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faChevronDown, faChevronUp, faUser } from '@fortawesome/free-solid-svg-icons';
import SparkTag from './common/SparkTag';
import { getExcludedCharacterIds } from '../utils/selectionExclusion';
import MissingSkillsDisplay from './common/MissingSkillsDisplay';

interface BreedingPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Suggestion {
    p1: Parent;
    p2: Parent;
    totalAffinity: number;
    totalWhiteSparks: number;
    uniqueWhiteSparks: number;
}

type PlannerTab = 'manual' | 'suggestions';
type ActiveSlot = 'parent1' | 'parent2' | null;

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };
const TOP_K_MANUAL = 10;
const TOP_K_SUGGESTIONS = 20;

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
    const [manualCheckedSkills, setManualCheckedSkills] = useState(new Set<string>());

    // Suggestions State
    const [trainee, setTrainee] = useState<Uma | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [suggestionCheckedSkills, setSuggestionCheckedSkills] = useState(new Set<string>());
    const [isSparkViewExpanded, setIsSparkViewExpanded] = useState(false);
    
    // Reset checked skills when the relevant data changes
    useEffect(() => { setManualCheckedSkills(new Set<string>()); }, [manualParent1, manualParent2]);
    useEffect(() => { setSuggestionCheckedSkills(new Set<string>()); }, [selectedSuggestion]);


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

        const topSuggestions: { uma: Uma; totalAffinity: number }[] = [];
        const compareFn = (a: { totalAffinity: number }, b: { totalAffinity: number }) => b.totalAffinity - a.totalAffinity;

        for (const tUma of potentialTrainees) {
            const totalAffinity = calculateFullAffinity(tUma, manualParent1, manualParent2, charaRelations, relationPoints, inventoryMap, umaMapById);
            const newSuggestion = { uma: tUma, totalAffinity };

            if (topSuggestions.length < TOP_K_MANUAL) {
                topSuggestions.push(newSuggestion);
                topSuggestions.sort(compareFn);
            } else {
                const worstSuggestion = topSuggestions[TOP_K_MANUAL - 1];
                if (newSuggestion.totalAffinity > worstSuggestion.totalAffinity) {
                    topSuggestions[TOP_K_MANUAL - 1] = newSuggestion;
                    topSuggestions.sort(compareFn);
                }
            }
        }
        return topSuggestions;

    }, [manualParent1, manualParent2, masterUmaList, inventoryMap, umaMapById, charaRelations, relationPoints, excludeInbreeding]);

    const { missingSkills: missingSkillsForManualPair, unsaturatedSkills: unsaturatedSkillsForManualPair, relevantWishlistCount: manualPairWishlistCount } = useMemo(() => {
        if (!manualParent1 || !manualParent2 || !goal) {
            return { missingSkills: [], unsaturatedSkills: [], relevantWishlistCount: 0 };
        }
        const missing = getMissingWishlistSkills(manualParent1, manualParent2, goal, inventoryMap, skillMapByName);
        const unsaturated = getUnsaturatedWishlistSkills(manualParent1, manualParent2, goal, inventoryMap, skillMapByName);
        return { ...missing, unsaturatedSkills: unsaturated };
    }, [manualParent1, manualParent2, goal, inventoryMap, skillMapByName]);

    const suggestions = useMemo<Suggestion[]>(() => {
        if (!trainee || roster.length < 2) return [];
        
        const topPairs: Suggestion[] = [];
        const compareFn = (a: Suggestion, b: Suggestion) => {
            if (b.totalAffinity !== a.totalAffinity) return b.totalAffinity - a.totalAffinity;
            if (b.totalWhiteSparks !== a.totalWhiteSparks) return b.totalWhiteSparks - a.totalWhiteSparks;
            return b.uniqueWhiteSparks - a.uniqueWhiteSparks;
        };

        for (let i = 0; i < roster.length; i++) {
            for (let j = i + 1; j < roster.length; j++) {
                const p1 = roster[i];
                const p2 = roster[j];

                const p1CharId = umaMapById.get(p1.umaId)?.characterId;
                const p2CharId = umaMapById.get(p2.umaId)?.characterId;

                if (p1CharId === trainee.characterId || p2CharId === trainee.characterId || p1CharId === p2CharId) {
                    continue;
                }

                const newPair: Suggestion = {
                    p1, p2,
                    totalAffinity: calculateFullAffinity(trainee, p1, p2, charaRelations, relationPoints, inventoryMap, umaMapById),
                    totalWhiteSparks: countTotalLineageWhiteSparks(p1, inventoryMap) + countTotalLineageWhiteSparks(p2, inventoryMap),
                    uniqueWhiteSparks: countUniqueCombinedLineageWhiteSparks(p1, p2, inventoryMap)
                };

                if (topPairs.length < TOP_K_SUGGESTIONS) {
                    topPairs.push(newPair);
                    topPairs.sort(compareFn);
                } else {
                    const worstPair = topPairs[TOP_K_SUGGESTIONS - 1];
                    if (compareFn(newPair, worstPair) < 0) {
                        topPairs[TOP_K_SUGGESTIONS - 1] = newPair;
                        topPairs.sort(compareFn);
                    }
                }
            }
        }
        return topPairs;
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
        const uniqueSkillNames = new Set<string>();
        
        const addUniqueSparks = (member: Parent | ManualParentData | null, isParent: boolean) => {
            if (!member) return;
            member.uniqueSparks.forEach(spark => {
                if (!uniqueSkillNames.has(spark.name)) {
                    unique.push({ ...spark, fromParent: isParent });
                    uniqueSkillNames.add(spark.name);
                }
            });
        };
        addUniqueSparks(p1, true); addUniqueSparks(p2, true);
        addUniqueSparks(gp1_1, false); addUniqueSparks(gp1_2, false);
        addUniqueSparks(gp2_1, false); addUniqueSparks(gp2_2, false);

        const white: Map<string, { name: string, totalStars: number, parentStars: number, tier: string | null }> = new Map();
        
        const processWhiteSpark = (spark: WhiteSpark, isParent: boolean) => {
             if (!white.has(spark.name)) {
                const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                white.set(spark.name, { name: spark.name, totalStars: 0, parentStars: 0, tier: wishlistItem?.tier || null });
            }
            const existing = white.get(spark.name)!;
            existing.totalStars += spark.stars;
            if (isParent) {
                existing.parentStars += spark.stars;
            }
        };

        [p1, p2].forEach(p => p.whiteSparks.forEach(s => processWhiteSpark(s, true)));
        [gp1_1, gp1_2, gp2_1, gp2_2].forEach(gp => {
             if (gp && 'whiteSparks' in gp) gp.whiteSparks.forEach(s => processWhiteSpark(s, false));
        });

        const sortedWhite = Array.from(white.values()).sort((a, b) => {
            const aTier = a.tier ? WISH_RANK_ORDER[a.tier] : 99;
            const bTier = b.tier ? WISH_RANK_ORDER[b.tier] : 99;
            if (aTier !== bTier) return aTier - bTier;
            if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
            return a.name.localeCompare(b.name);
        });

        return { blue, pink, unique, white: sortedWhite };
    }, [selectedSuggestion, inventoryMap, goal]);

    const { missingSkills: missingSkillsForSelectedSuggestion, unsaturatedSkills: unsaturatedSkillsForSelectedSuggestion, relevantWishlistCount: selectedSuggestionWishlistCount } = useMemo(() => {
        if (!selectedSuggestion || !goal) {
            return { missingSkills: [], unsaturatedSkills: [], relevantWishlistCount: 0 };
        }
        const missing = getMissingWishlistSkills(selectedSuggestion.p1, selectedSuggestion.p2, goal, inventoryMap, skillMapByName);
        const unsaturated = getUnsaturatedWishlistSkills(selectedSuggestion.p1, selectedSuggestion.p2, goal, inventoryMap, skillMapByName);
        return { ...missing, unsaturatedSkills: unsaturated };
    }, [selectedSuggestion, goal, inventoryMap, skillMapByName]);

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

    const handleToggleSkill = (skillName: string, type: 'manual' | 'suggestion') => {
        const setChecked = type === 'manual' ? setManualCheckedSkills : setSuggestionCheckedSkills;
        setChecked(prev => {
            const newSet = new Set(prev);
            if (newSet.has(skillName)) {
                newSet.delete(skillName);
            } else {
                newSet.add(skillName);
            }
            return newSet;
        });
    };
    
    const handleClearChecks = (type: 'manual' | 'suggestion') => {
        if (type === 'manual') {
            setManualCheckedSkills(new Set<string>());
        } else {
            setSuggestionCheckedSkills(new Set<string>());
        }
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
        return getExcludedCharacterIds({
            context: 'planner',
            activeSlot,
            parent1: manualParent1,
            parent2: manualParent2,
            umaMapById,
            inventory: appData.inventory
        });
    }, [activeSlot, manualParent1, manualParent2, umaMapById, appData.inventory]);

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
                                        <h4 className="breeding-planner__sub-header">{t('breedingPlanner.bestTrainees')}</h4>
                                        {traineeSuggestionsForManualPair.map((s, index) => (
                                             <div key={s.uma.id} className="breeding-planner__suggestion-item">
                                                <div className="breeding-planner__suggestion-rank">#{index + 1}</div>
                                                <div className="breeding-planner__suggestion-pair">
                                                    {renderAvatar(s.uma.id)}
                                                    <span className="breeding-planner__suggestion-name">{s.uma[displayNameProp]}</span>
                                                </div>
                                                <div className="breeding-planner__suggestion-scores">
                                                    <div className="breeding-planner__suggestion-affinity">{s.totalAffinity} {t('breedingPlanner.totalAffinity')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="breeding-planner__missing-skills-section">
                                        <h4 className="breeding-planner__sub-header">{t('breedingPlanner.missingSkills')}</h4>
                                        <MissingSkillsDisplay 
                                            missingSkills={missingSkillsForManualPair} 
                                            unsaturatedSkills={unsaturatedSkillsForManualPair}
                                            totalWishlistCount={manualPairWishlistCount} 
                                            checkedSkills={manualCheckedSkills} 
                                            onToggleSkill={(name) => handleToggleSkill(name, 'manual')}
                                            onClearChecks={() => handleClearChecks('manual')}
                                        />
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
                                                    <div className="breeding-planner__suggestion-parent-score">{s.totalWhiteSparks} {t('breedingPlanner.totalWhiteSparks')}</div>
                                                </div>
                                            </div>
                                        )) : <p className="card__placeholder-text text-center py-8">{t('breedingPlanner.noResults')}</p>}
                                    </div>
                                    <div className="breeding-planner__suggestion-detail">
                                        {selectedSuggestion ? (
                                            <>
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
                                                        <span className="breeding-planner__detail-summary-value">{selectedSuggestion.totalWhiteSparks}</span>
                                                        <span className="breeding-planner__detail-summary-label">{t('breedingPlanner.totalWhiteSparks')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="breeding-planner__detail-summary-value">{selectedSuggestion.uniqueWhiteSparks}</span>
                                                        <span className="breeding-planner__detail-summary-label">{t('breedingPlanner.uniqueWhiteSparks')}</span>
                                                    </div>
                                                </div>
                                                <div className={`breeding-planner__detail-sparks ${isSparkViewExpanded ? 'breeding-planner__detail-sparks--expanded' : ''}`}>
                                                    <button className="breeding-planner__expand-btn" onClick={() => setIsSparkViewExpanded(prev => !prev)}>
                                                        <FontAwesomeIcon icon={isSparkViewExpanded ? faChevronDown : faChevronUp} />
                                                    </button>
                                                    {aggregatedSparksForSelected && (
                                                        <div className="breeding-planner__detail-sparks-content">
                                                            <div className="parent-card__spark-container">
                                                                {Object.entries(aggregatedSparksForSelected.blue).map(([type, data]) => (
                                                                    <SparkTag key={type} category="blue" type={`${data.total}★ ${t(type, { ns: 'game' })}${data.parent > 0 && data.parent < data.total ? ` (${data.parent}★)` : ''}`} stars={data.total}>
                                                                        {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" title={t('parentCard.parentSource')} />}
                                                                    </SparkTag>
                                                                ))}
                                                                {Object.entries(aggregatedSparksForSelected.pink).map(([type, data]) => (
                                                                    <SparkTag key={type} category="pink" type={`${data.total}★ ${t(type, { ns: 'game' })}${data.parent > 0 && data.parent < data.total ? ` (${data.parent}★)` : ''}`} stars={data.total}>
                                                                        {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" title={t('parentCard.parentSource')} />}
                                                                    </SparkTag>
                                                                ))}
                                                                {aggregatedSparksForSelected.unique.map(spark => (
                                                                    <SparkTag key={spark.name} category="unique" type={`${getSkillDisplayName(spark.name)} (${spark.stars}★)`} stars={spark.stars} />
                                                                ))}
                                                                {aggregatedSparksForSelected.white.map(spark => {
                                                                    const tier = spark.tier ? `(${t('parentCard.rank')} ${spark.tier})` : null;
                                                                    return (
                                                                        <SparkTag key={spark.name} category="white" type={`${spark.totalStars}★ ${getSkillDisplayName(spark.name)}${spark.parentStars > 0 && spark.parentStars < spark.totalStars ? ` (${spark.parentStars}★)` : ''}`} stars={spark.totalStars}>
                                                                            {spark.parentStars > 0 && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" title={t('parentCard.parentSource')} />}
                                                                            {tier && <span className="parent-card__spark-tier">{tier}</span>}
                                                                        </SparkTag>
                                                                    );
                                                                })}
                                                            </div>
                                                            <hr className="breeding-planner__divider" />
                                                            <MissingSkillsDisplay 
                                                                missingSkills={missingSkillsForSelectedSuggestion}
                                                                unsaturatedSkills={unsaturatedSkillsForSelectedSuggestion}
                                                                totalWishlistCount={selectedSuggestionWishlistCount} 
                                                                checkedSkills={suggestionCheckedSkills} 
                                                                onToggleSkill={(name) => handleToggleSkill(name, 'suggestion')} 
                                                                onClearChecks={() => handleClearChecks('suggestion')}
                                                            />
                                                        </div>
                                                    )}
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