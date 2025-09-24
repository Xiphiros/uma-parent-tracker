import { useState, useMemo } from 'react';
import { BreedingPair, Parent } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { calculateUpgradeProbability } from '../utils/probability';
import './ProbabilityCalculatorModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface ProbabilityCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

const STATS = ['speed', 'stamina', 'power', 'guts', 'wit'];
const ASSUMED_WHITE_SPARKS_PER_RUN = 5;
const ASSUMED_A_RANK_APTITUDES = 5;

const ProbabilityCalculatorModal = ({ isOpen, onClose, pair }: ProbabilityCalculatorModalProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { getActiveProfile, skillMapByName, appData } = useAppContext();
    
    const [targetStats, setTargetStats] = useState<Record<string, number>>({
        speed: 1100, stamina: 1100, power: 1100, guts: 600, wit: 600
    });
    const [trainingRank, setTrainingRank] = useState<'ss' | 'ss+'>('ss');
    
    const activeGoal = getActiveProfile()?.goal;
    const inventoryMap = useMemo(() => new Map(appData.inventory.map((p: Parent) => [p.id, p])), [appData.inventory]);

    const handleStatChange = (stat: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setTargetStats(prev => ({ ...prev, [stat]: numValue }));
        } else if (value === '') {
            setTargetStats(prev => ({...prev, [stat]: 0}));
        }
    };

    const upgradeProb = useMemo(() => {
        if (!pair || !activeGoal) return 0;
        return calculateUpgradeProbability(pair, activeGoal, targetStats, trainingRank, inventoryMap, skillMapByName);
    }, [pair, activeGoal, targetStats, trainingRank, inventoryMap, skillMapByName]);

    const formatResult = (prob: number) => {
        if (prob === 0 || !prob) return { percent: '0%', runs: '∞' };
        const runs = Math.ceil(1 / prob);
        return {
            percent: `${(prob * 100).toFixed(2)}%`,
            runs: runs.toLocaleString()
        };
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
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss')}>{t('breedingPlanner.rankBelowSS')}</button>
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss+' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss+')}>{t('breedingPlanner.rankSSPlus')}</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="prob-calc__results">
                    <h3 className="prob-calc__results-title">{t('breedingPlanner.estimatedProbabilities')}</h3>
                    <div className="prob-calc__results-grid">
                         <div className="prob-calc__result-item">
                            <div className="prob-calc__result-header">
                                <span className="prob-calc__result-name">
                                    {t('breedingPlanner.probScoreUpgrade')}
                                    <span 
                                        className="ml-2 text-stone-400"
                                        title={t('breedingPlanner.probAssumptionsText', { count: ASSUMED_WHITE_SPARKS_PER_RUN })}
                                    >
                                        <FontAwesomeIcon icon={faInfoCircle} />
                                    </span>
                                </span>
                                <span className="prob-calc__result-percent">{formatResult(upgradeProb).percent}</span>
                            </div>
                            <p className="prob-calc__result-runs">{t('breedingPlanner.avgRuns', { value: formatResult(upgradeProb).runs })}</p>
                        </div>
                    </div>
                     <div className="prob-calc__disclaimer">
                        <p><strong>{t('common:disclaimer')}:</strong> {t('breedingPlanner.disclaimerText')}</p>
                        <ul>
                            <li>{t('breedingPlanner.disclaimerScoreUpgrade')}</li>
                            <li>{t('breedingPlanner.disclaimerBlue')}</li>
                            <li>{t('breedingPlanner.disclaimerPink', { count: ASSUMED_A_RANK_APTITUDES })}</li>
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