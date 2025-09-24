import { useState, useEffect, useRef } from 'react';
import { BreedingPair } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './ProbabilityCalculatorModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { ProbabilityWorkerPayload } from '../utils/upgradeProbability';

interface ProbabilityCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

type CalculationStatus = 'idle' | 'calculating' | 'success' | 'error';

const STATS = ['speed', 'stamina', 'power', 'guts', 'wit'];
const ASSUMED_A_RANK_APTITUDES = 5;

const ProbabilityCalculatorModal = ({ isOpen, onClose, pair }: ProbabilityCalculatorModalProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { getActiveProfile, skillMapByName, appData } = useAppContext();
    
    const [targetStats, setTargetStats] = useState<Record<string, number>>({
        speed: 1100, stamina: 1100, power: 1100, guts: 600, wit: 600
    });
    const [trainingRank, setTrainingRank] = useState<'ss' | 'ss+'>('ss');
    const [spBudget, setSpBudget] = useState(1500);

    const [calculationState, setCalculationState] = useState<{ status: CalculationStatus; result: number | null }>({
        status: 'idle',
        result: null,
    });
    const workerRef = useRef<Worker | null>(null);
    
    const activeGoal = getActiveProfile()?.goal;

    useEffect(() => {
        if (isOpen) {
            setCalculationState({ status: 'idle', result: null }); // Reset on open
            const worker = new Worker(new URL('../workers/probability.worker.ts', import.meta.url), { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = (e) => {
                if (e.data.result !== undefined) {
                    setCalculationState({ status: 'success', result: e.data.result });
                } else if (e.data.error) {
                    console.error("Probability worker error:", e.data.error);
                    setCalculationState({ status: 'error', result: null });
                }
            };
            
            worker.onerror = (e) => {
                console.error("Worker error:", e);
                setCalculationState({ status: 'error', result: null });
            };

            return () => {
                worker.terminate();
                workerRef.current = null;
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const worker = workerRef.current;
        if (!worker || !pair || !activeGoal) {
            setCalculationState({ status: 'idle', result: null });
            return;
        }

        const handler = setTimeout(() => {
            setCalculationState({ status: 'calculating', result: null });
            const payload: ProbabilityWorkerPayload = {
                pair,
                goal: activeGoal,
                targetStats,
                trainingRank,
                inventory: appData.inventory,
                skillMapEntries: Array.from(skillMapByName.entries()),
                spBudget
            };
            worker.postMessage(payload);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [pair, activeGoal, targetStats, trainingRank, spBudget, appData.inventory, skillMapByName]);


    const handleStatChange = (stat: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setTargetStats(prev => ({ ...prev, [stat]: numValue }));
        } else if (value === '') {
            setTargetStats(prev => ({...prev, [stat]: 0}));
        }
    };
    
    const handleBudgetChange = (value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setSpBudget(numValue);
        } else if (value === '') {
            setSpBudget(0);
        }
    };

    const formatResult = () => {
        const { status, result } = calculationState;
        if (status === 'error') return { percent: 'Error', runs: 'N/A' };
        if (status === 'idle' || status === 'calculating' || result === null) return { percent: '—', runs: '—' };
        
        if (result === 0) return { percent: '0.00%', runs: '∞' };
        if (result < 0.00000001) {
             const runs = 1 / result;
             return { percent: '0.00%', runs: runs.toLocaleString('en-US', { notation: 'scientific' }) };
        }
        const runs = Math.ceil(1 / result);
        return {
            percent: `${(result * 100).toFixed(2)}%`,
            runs: runs.toLocaleString()
        };
    };
    
    const formattedResult = formatResult();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.probabilityCalculator')} size="lg">
            <div className="prob-calc__layout">
                <div className="prob-calc__inputs">
                    <h3 className="prob-calc__inputs-title">{t('breedingPlanner.inputs')}</h3>
                    <fieldset disabled={calculationState.status === 'calculating'} className="prob-calc__input-group">
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
                            <label htmlFor="sp-budget" className="form__label form__label--xs flex items-center">
                                {t('breedingPlanner.spBudget')}
                                <span className="ml-1 text-stone-400" title={t('breedingPlanner.spBudgetTooltip')}>
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                </span>
                            </label>
                            <input
                                type="number"
                                id="sp-budget"
                                className="form__input form__input--small w-full"
                                value={spBudget}
                                onChange={(e) => handleBudgetChange(e.target.value)}
                                step="100"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="form__label form__label--xs">{t('breedingPlanner.trainingRank')}</label>
                             <div className="top-pair__toggle-group">
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss')}>{t('breedingPlanner.rankBelowSS')}</button>
                                <button className={`top-pair__toggle-btn ${trainingRank === 'ss+' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss+')}>{t('breedingPlanner.rankSSPlus')}</button>
                            </div>
                        </div>
                    </fieldset>
                </div>
                <div className="prob-calc__results">
                    <h3 className="prob-calc__results-title">{t('breedingPlanner.estimatedProbabilities')}</h3>
                    <div className="prob-calc__results-grid">
                         <div className="prob-calc__result-item">
                            {calculationState.status === 'calculating' ? (
                                <p className="text-center text-stone-500">{t('common:calculating')}...</p>
                            ) : (
                                <>
                                    <div className="prob-calc__result-header">
                                        <span className="prob-calc__result-name">
                                            {t('breedingPlanner.probScoreUpgrade')}
                                            <span className="ml-2 text-stone-400">
                                                <FontAwesomeIcon icon={faInfoCircle} />
                                            </span>
                                        </span>
                                        <span className="prob-calc__result-percent">{formattedResult.percent}</span>
                                    </div>
                                    <p className="prob-calc__result-runs">{t('breedingPlanner.avgRuns', { value: formattedResult.runs })}</p>
                                </>
                            )}
                        </div>
                    </div>
                     <div className="prob-calc__disclaimer">
                        <p><strong>{t('common:disclaimer')}:</strong> {t('breedingPlanner.disclaimerText')}</p>
                        <ul>
                            <li>{t('breedingPlanner.disclaimerScoreUpgrade')}</li>
                            <li>{t('breedingPlanner.disclaimerBlue')}</li>
                            <li>{t('breedingPlanner.disclaimerPink', { count: ASSUMED_A_RANK_APTITUDES })}</li>
                            <li>{t('breedingPlanner.disclaimerWhiteSP')}</li>
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