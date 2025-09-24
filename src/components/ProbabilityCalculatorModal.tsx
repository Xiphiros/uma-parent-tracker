import { useState, useMemo } from 'react';
import { BreedingPair, WishlistItem } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { calculateBlueSparkProb, calculatePinkSparkProb, calculateSingleWhiteSparkProb } from '../utils/probability';
import { getCombinedLineageSkillNames } from '../utils/affinity';
import './ProbabilityCalculatorModal.css';

interface ProbabilityCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

const STATS = ['speed', 'stamina', 'power', 'guts', 'wit'];

const ProbabilityCalculatorModal = ({ isOpen, onClose, pair }: ProbabilityCalculatorModalProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { getActiveProfile, masterSkillList, skillMapByName, appData, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    
    const [targetStats, setTargetStats] = useState<Record<string, number>>({
        speed: 1100, stamina: 1100, power: 1100, guts: 600, wit: 600
    });
    const [trainingRank, setTrainingRank] = useState<'ss' | 'ss+'>('ss');
    
    const activeGoal = getActiveProfile()?.goal;
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const handleStatChange = (stat: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setTargetStats(prev => ({ ...prev, [stat]: numValue }));
        } else if (value === '') {
            setTargetStats(prev => ({...prev, [stat]: 0}));
        }
    };

    const blueSparkProb = useMemo(() => {
        if (!activeGoal) return 0;
        return calculateBlueSparkProb(activeGoal, targetStats);
    }, [activeGoal, targetStats]);
    
    const pinkSparkProb = useMemo(() => {
        if (!activeGoal) return 0;
        return calculatePinkSparkProb(activeGoal, trainingRank);
    }, [activeGoal, trainingRank]);
    
    const highValueMissingSkills = useMemo(() => {
        if (!pair || !activeGoal) return [];
        const lineageSkills = getCombinedLineageSkillNames(pair.p1, pair.p2, inventoryMap);
        return activeGoal.wishlist.filter(item => 
            (item.tier === 'S' || item.tier === 'A') && !lineageSkills.has(item.name)
        );
    }, [pair, activeGoal, inventoryMap]);
    
    const whiteSparkProbs = useMemo(() => {
        if (!pair || !activeGoal) return [];
        return highValueMissingSkills.map(item => ({
            name: item.name,
            prob: calculateSingleWhiteSparkProb(item, pair, trainingRank, masterSkillList, skillMapByName, inventoryMap)
        }));
    }, [pair, highValueMissingSkills, trainingRank, masterSkillList, skillMapByName, inventoryMap, activeGoal]);

    const formatResult = (prob: number) => {
        if (prob === 0 || !prob) return { percent: '0%', runs: '∞' };
        const runs = Math.ceil(1 / prob);
        return {
            percent: `${(prob * 100).toFixed(2)}%`,
            runs: runs.toLocaleString()
        };
    };

    const getSkillDisplayName = (name_en: string) => {
        return skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.probabilityCalculator')} size="lg">
            <div className="prob-calc__layout">
                <div className="prob-calc__inputs">
                    <h3 className="prob-calc__inputs-title">{t('breedingPlanner.inputs')}</h3>
                    <div className="prob-calc__input-group">
                        <div>
                            <label className="form__label form__label--xs">{t('breedingPlanner.targetStats')}</label>
                            {STATS.map(stat => (
                                <div key={stat} className="prob-calc__stat-input mb-2">
                                    <label htmlFor={`stat-${stat}`}>{t(stat.charAt(0).toUpperCase() + stat.slice(1), { ns: 'game' })}</label>
                                    <input 
                                        type="number" 
                                        id={`stat-${stat}`} 
                                        className="form__input form__input--small"
                                        value={targetStats[stat]}
                                        onChange={(e) => handleStatChange(stat, e.target.value)}
                                        step="50"
                                        min="0"
                                    />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="form__label form__label--xs">{t('breedingPlanner.trainingRank')}</label>
                             <div className="top-pair__toggle-group">
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss')}>A+ ~ SS</button>
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss+' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss+')}>SS+ ~</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="prob-calc__results">
                    <h3 className="prob-calc__results-title">{t('breedingPlanner.estimatedProbabilities')}</h3>
                    <div className="prob-calc__results-grid">
                        <div className="prob-calc__result-item">
                            <div className="prob-calc__result-header">
                                <span className="prob-calc__result-name">{t('breedingPlanner.primaryBlueSpark')}</span>
                                <span className="prob-calc__result-percent">{formatResult(blueSparkProb).percent}</span>
                            </div>
                            <p className="prob-calc__result-runs">{t('breedingPlanner.avgRuns', { count: formatResult(blueSparkProb).runs })}</p>
                        </div>
                        <div className="prob-calc__result-item">
                            <div className="prob-calc__result-header">
                                <span className="prob-calc__result-name">{t('breedingPlanner.primaryPinkSpark')}</span>
                                <span className="prob-calc__result-percent">{formatResult(pinkSparkProb).percent}</span>
                            </div>
                             <p className="prob-calc__result-runs">{t('breedingPlanner.avgRuns', { count: formatResult(pinkSparkProb).runs })}</p>
                        </div>

                        {whiteSparkProbs.map(result => (
                             <div key={result.name} className="prob-calc__result-item">
                                <div className="prob-calc__result-header">
                                    <span className="prob-calc__result-name">{getSkillDisplayName(result.name)} (3★)</span>
                                    <span className="prob-calc__result-percent">{formatResult(result.prob).percent}</span>
                                </div>
                                <p className="prob-calc__result-runs">{t('breedingPlanner.avgRuns', { count: formatResult(result.prob).runs })}</p>
                            </div>
                        ))}
                         {highValueMissingSkills.length === 0 && <p className="text-sm text-stone-500">{t('breedingPlanner.noMissingSkills')}</p>}
                    </div>
                     <div className="prob-calc__disclaimer">
                        <p><strong>{t('common:disclaimer')}:</strong> {t('breedingPlanner.disclaimerText')}</p>
                        <ul>
                            <li>{t('breedingPlanner.disclaimerBlue')}</li>
                            <li>{t('breedingPlanner.disclaimerPink', { count: 5 })}</li>
                            <li>{t('breedingPlanner.disclaimerWhite')}</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
            </div>
        </Modal>
    );
};

export default ProbabilityCalculatorModal;