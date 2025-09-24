import { useState, useEffect, useRef, useMemo } from 'react';
import { BreedingPair, Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './ProbabilityCalculatorModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { ProbabilityWorkerPayload } from '../utils/upgradeProbability';
import SelectAcquirableSkillsModal from './SelectAcquirableSkillsModal';
import MultiSelect from './common/MultiSelect';

interface ProbabilityCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

type CalculationStatus = 'idle' | 'calculating' | 'success' | 'error';
interface CalculationResult {
    probScoreUpgrade: number;
    probSparkCountUpgrade: number;
    targetSparkCount: number;
}

const STATS = ['speed', 'stamina', 'power', 'guts', 'wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

const ProbabilityCalculatorModal = ({ isOpen, onClose, pair }: ProbabilityCalculatorModalProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { getActiveProfile, skillMapByName, appData, masterSkillList } = useAppContext();
    
    // Target Outcome State
    const [targetStats, setTargetStats] = useState<Record<string, number>>({
        speed: 1100, stamina: 1100, power: 1100, guts: 600, wit: 600
    });
    const [trainingRank, setTrainingRank] = useState<'ss' | 'ss+'>('ss');
    const [spBudget, setSpBudget] = useState(1500);

    // Run Configuration State
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [acquirableSkillIds, setAcquirableSkillIds] = useState<Set<string>>(new Set());
    const [obtainableAptitudes, setObtainableAptitudes] = useState<string[]>(['Turf', 'Mile', 'Medium', 'Pace Chaser', 'Late Surger']);


    const [calculationState, setCalculationState] = useState<{ status: CalculationStatus; result: CalculationResult | null }>({
        status: 'idle',
        result: null,
    });
    const workerRef = useRef<Worker | null>(null);
    
    const activeGoal = getActiveProfile()?.goal;

    const initialSkillPool = useMemo(() => {
        if (!pair) return new Set<string>();
        return new Set<string>();
    }, [pair]);

    useEffect(() => {
        if (isOpen) {
            setAcquirableSkillIds(initialSkillPool);
        }
    }, [isOpen, initialSkillPool]);

    useEffect(() => {
        if (isOpen) {
            setCalculationState({ status: 'idle', result: null });
            const worker = new Worker(new URL('../workers/probability.worker.ts', import.meta.url), { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = (e) => {
                if (e.data.result) {
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
                spBudget,
                acquirableSkillIds: Array.from(acquirableSkillIds), 
                targetAptitudes: obtainableAptitudes,
            };
            worker.postMessage(payload);
        }, 300);

        return () => clearTimeout(handler);
    }, [pair, activeGoal, targetStats, trainingRank, spBudget, acquirableSkillIds, obtainableAptitudes, appData.inventory, skillMapByName]);


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
    
    const formatProbAsFraction = (prob: number | null | undefined): string => {
        if (prob === null || prob === undefined) return '—';
        if (prob <= 0) return '1 / ∞';
        const denominator = Math.round(1 / prob);
        return `1 / ${denominator.toLocaleString()}`;
    };

    const translatedAptitudeOptions = PINK_SPARK_TYPES.map(opt => ({
        value: opt,
        label: t(opt, { ns: 'game' })
    }));

    const acquirableSkillsSummary = () => {
        if (acquirableSkillIds.size === 0) return t('breedingPlanner.allSkillsConsidered');
        return t('breedingPlanner.skillsSelected', { count: acquirableSkillIds.size });
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.probabilityCalculator')} size="lg">
                <div className="prob-calc__layout">
                    <div className="prob-calc__inputs">
                        <fieldset disabled={calculationState.status === 'calculating'} className="prob-calc__input-group">
                            <legend className="prob-calc__inputs-title">{t('breedingPlanner.targetOutcome')}</legend>
                            <div>
                                <label className="form__label form__label--xs">{t('breedingPlanner.targetStats')}</label>
                                {STATS.map(stat => (
                                    <div key={stat} className="prob-calc__stat-input mb-2">
                                        <label htmlFor={`stat-${stat}`}>{t(stat.charAt(0).toUpperCase() + stat.slice(1), { ns: 'game' })}</label>
                                        <input type="number" id={`stat-${stat}`} className="form__input form__input--small" value={targetStats[stat]} onChange={(e) => handleStatChange(stat, e.target.value)} step="50" min="0"/>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label htmlFor="sp-budget" className="form__label form__label--xs flex items-center">
                                    {t('breedingPlanner.spBudget')}
                                    <span className="ml-1 text-stone-400" title={t('breedingPlanner.spBudgetTooltip')}><FontAwesomeIcon icon={faInfoCircle} /></span>
                                </label>
                                <input type="number" id="sp-budget" className="form__input form__input--small w-full" value={spBudget} onChange={(e) => handleBudgetChange(e.target.value)} step="100" min="0"/>
                            </div>
                            <div>
                                <label className="form__label form__label--xs">{t('breedingPlanner.trainingRank')}</label>
                                <div className="top-pair__toggle-group">
                                    <button className={`top-pair__toggle-btn ${trainingRank === 'ss' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss')}>{t('breedingPlanner.rankBelowSS')}</button>
                                    <button className={`top-pair__toggle-btn ${trainingRank === 'ss+' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setTrainingRank('ss+')}>{t('breedingPlanner.rankSSPlus')}</button>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset disabled={calculationState.status === 'calculating'} className="prob-calc__input-group mt-4">
                            <legend className="prob-calc__inputs-title">{t('breedingPlanner.runConfiguration')}</legend>
                             <div>
                                <label className="form__label form__label--xs">{t('breedingPlanner.acquirableSkills')}</label>
                                <button type="button" className="button button--secondary w-full justify-center" onClick={() => setIsSkillModalOpen(true)}>{t('breedingPlanner.selectAcquirableSkills')}</button>
                                <p className="text-xs text-stone-500 text-center mt-1">{acquirableSkillsSummary()}</p>
                            </div>
                            <div>
                                <label className="form__label form__label--xs">{t('breedingPlanner.obtainableAptitudes')}</label>
                                <MultiSelect options={translatedAptitudeOptions} selectedValues={obtainableAptitudes} onChange={setObtainableAptitudes} />
                            </div>
                        </fieldset>
                    </div>
                    <div className="prob-calc__results">
                        <h3 className="prob-calc__results-title">{t('breedingPlanner.estimatedProbabilities')}</h3>
                        <div className="prob-calc__results-grid">
                            {calculationState.status === 'calculating' ? (
                                <div className="prob-calc__result-item">
                                    <p className="text-center text-stone-500">{t('common:calculating')}...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="prob-calc__result-item">
                                        <div className="prob-calc__result-header">
                                            <span className="prob-calc__result-name">{t('breedingPlanner.probScoreUpgrade')}</span>
                                            <span className="prob-calc__result-percent">{formatProbAsFraction(calculationState.result?.probScoreUpgrade)}</span>
                                        </div>
                                    </div>
                                    <div className="prob-calc__result-item">
                                        <div className="prob-calc__result-header">
                                            <span className="prob-calc__result-name">
                                                {calculationState.result
                                                    ? t('breedingPlanner.probSparkCountUpgrade', { count: calculationState.result.targetSparkCount })
                                                    : t('breedingPlanner.probSparkCountUpgrade_label')
                                                }
                                            </span>
                                            <span className="prob-calc__result-percent">{formatProbAsFraction(calculationState.result?.probSparkCountUpgrade)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="prob-calc__disclaimer">
                            <p><strong>{t('common:disclaimer')}:</strong> {t('breedingPlanner.disclaimerText')}</p>
                            <ul>
                                <li>{t('breedingPlanner.disclaimerScoreUpgrade')}</li>
                                <li>{t('breedingPlanner.disclaimerBlue')}</li>
                                <li>{t('breedingPlanner.disclaimerPinkDynamic')}</li>
                                <li>{t('breedingPlanner.disclaimerWhiteSP')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
                </div>
            </Modal>
            
            <SelectAcquirableSkillsModal
                isOpen={isSkillModalOpen}
                onClose={() => setIsSkillModalOpen(false)}
                allSkills={masterSkillList.filter(s => s.type === 'normal')}
                selectedIds={acquirableSkillIds}
                onSave={setAcquirableSkillIds}
            />
        </>
    );
};

export default ProbabilityCalculatorModal;