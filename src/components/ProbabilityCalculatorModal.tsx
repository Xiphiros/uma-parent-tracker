import { useState, useMemo, useEffect, useRef } from 'react';
import { BreedingPair } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './ProbabilityCalculatorModal.css';
import SelectAcquirableSkillsModal from './SelectAcquirableSkillsModal';
import SelectConditionalSkillsModal from './SelectConditionalSkillsModal';
import { ProbabilityWorkerPayload } from '../utils/upgradeProbability';
import MultiSelect from './common/MultiSelect';
import { formatProbability } from '../utils/ui';

interface ProbabilityCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

const STAT_NAMES = ['speed', 'stamina', 'power', 'guts', 'wit'];
const PINK_SPARK_OPTIONS = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

const ProbabilityCalculatorModal = ({ isOpen, onClose, pair }: ProbabilityCalculatorModalProps) => {
    const { t } = useTranslation(['roster', 'common', 'game']);
    const { getActiveProfile, appData, masterSkillList, skillMapByName } = useAppContext();
    const goal = getActiveProfile()?.goal;

    const [targetStats, setTargetStats] = useState<Record<string, number>>({ speed: 1100, stamina: 1100, power: 1100, guts: 1100, wit: 1100 });
    const [spBudget, setSpBudget] = useState(1800);
    const [trainingRank, setTrainingRank] = useState<'ss' | 'ss+'>('ss');
    const [acquirableSkillIds, setAcquirableSkillIds] = useState(new Set<string>());
    const [conditionalSkillIds, setConditionalSkillIds] = useState(new Set<string>());
    const [targetAptitudes, setTargetAptitudes] = useState<string[]>([]);
    
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isConditionalModalOpen, setIsConditionalModalOpen] = useState(false);
    const [results, setResults] = useState<{ probScoreUpgrade: number; probSparkCountUpgrade: number; targetSparkCount: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/probability.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e) => {
            if (e.data.error) {
                setError(e.data.error);
            } else {
                setResults(e.data.result);
            }
            setIsLoading(false);
        };
        return () => workerRef.current?.terminate();
    }, []);

    useEffect(() => {
        if (isOpen && pair && goal) {
            // Reset state on open
            setResults(null);
            setError(null);
            setIsLoading(false);
            setAcquirableSkillIds(new Set<string>());
            setConditionalSkillIds(new Set<string>());
            setTargetAptitudes(goal.primaryPink);
        }
    }, [isOpen, pair, goal]);

    const handleCalculate = () => {
        if (!pair || !goal || !workerRef.current) return;
        setIsLoading(true);
        setError(null);
        setResults(null);

        const payload: ProbabilityWorkerPayload = {
            pair, goal, targetStats, trainingRank,
            inventory: appData.inventory,
            skillMapEntries: Array.from(skillMapByName.entries()),
            spBudget,
            acquirableSkillIds: Array.from(acquirableSkillIds),
            conditionalSkillIds: Array.from(conditionalSkillIds),
            targetAptitudes
        };
        workerRef.current.postMessage(payload);
    };
    
    const translatedAptitudeOptions = PINK_SPARK_OPTIONS.map(opt => ({ value: opt, label: t(opt, { ns: 'game' }) }));
    
    const purchasableSkills = useMemo(() => masterSkillList.filter(s => s.type === 'normal' && !s.id.startsWith('race_') && !s.id.startsWith('scenario_') && !s.id.startsWith('aptitude_')), [masterSkillList]);
    const conditionalSkills = useMemo(() => masterSkillList.filter(s => s.id.startsWith('race_') || s.id.startsWith('scenario_') || s.id.startsWith('aptitude_')), [masterSkillList]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.probabilityCalculator')} size="xl">
                <div className="prob-calc__layout">
                    <div className="prob-calc__inputs">
                        <h4 className="prob-calc__inputs-title">{t('breedingPlanner.inputs')}</h4>
                        <div className="prob-calc__input-group">
                            <div>
                                <label className="form__label">{t('breedingPlanner.targetStats')}</label>
                                {STAT_NAMES.map(stat => (
                                    <div key={stat} className="prob-calc__stat-input">
                                        <label htmlFor={`stat-${stat}`}>{t(stat.charAt(0).toUpperCase() + stat.slice(1), { ns: 'game' })}</label>
                                        <input type="number" id={`stat-${stat}`} className="form__input" value={targetStats[stat]} onChange={e => setTargetStats(p => ({ ...p, [stat]: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label htmlFor="sp-budget" className="form__label" title={t('breedingPlanner.spBudgetTooltip')}>{t('breedingPlanner.spBudget')}</label>
                                <input type="number" id="sp-budget" className="form__input" value={spBudget} onChange={e => setSpBudget(parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="form__label">{t('breedingPlanner.trainingRank')}</label>
                                <select className="form__input" value={trainingRank} onChange={e => setTrainingRank(e.target.value as 'ss' | 'ss+')}>
                                    <option value="ss">{t('breedingPlanner.rankBelowSS')}</option>
                                    <option value="ss+">{t('breedingPlanner.rankSSPlus')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="form__label">{t('breedingPlanner.acquirableSkills')}</label>
                                <button className="button button--secondary w-full justify-center" onClick={() => setIsSkillModalOpen(true)}>{t('breedingPlanner.selectAcquirableSkills')}</button>
                                <p className="text-xs text-stone-500 text-center mt-1">{acquirableSkillIds.size > 0 ? t('breedingPlanner.skillsSelected', { count: acquirableSkillIds.size }) : t('breedingPlanner.allSkillsConsidered')}</p>
                            </div>
                            <div>
                                <label className="form__label">{t('breedingPlanner.conditionalSkills')}</label>
                                <button className="button button--secondary w-full justify-center" onClick={() => setIsConditionalModalOpen(true)}>{t('breedingPlanner.selectConditionalSkills')}</button>
                                <p className="text-xs text-stone-500 text-center mt-1">{conditionalSkillIds.size > 0 ? t('breedingPlanner.skillsSelected', { count: conditionalSkillIds.size }) : t('breedingPlanner.noConditionalSkills')}</p>
                            </div>
                            <div>
                                <label className="form__label">{t('breedingPlanner.obtainableAptitudes')}</label>
                                <MultiSelect options={translatedAptitudeOptions} selectedValues={targetAptitudes} onChange={setTargetAptitudes} />
                            </div>
                        </div>
                    </div>
                    <div className="prob-calc__results">
                        <h4 className="prob-calc__results-title">{t('breedingPlanner.estimatedProbabilities')}</h4>
                        <div className="prob-calc__results-grid">
                            {isLoading && <p className="card__placeholder-text">{t('calculating', { ns: 'common' })}...</p>}
                            {error && <p className="text-red-500">{error}</p>}
                            {results && (
                                <>
                                    <div className="prob-calc__result-item">
                                        <div className="prob-calc__result-header">
                                            <span className="prob-calc__result-name">{t('breedingPlanner.probScoreUpgrade')}</span>
                                            <span className="prob-calc__result-value">{formatProbability(results.probScoreUpgrade)}</span>
                                        </div>
                                    </div>
                                    <div className="prob-calc__result-item">
                                        <div className="prob-calc__result-header">
                                            <span className="prob-calc__result-name">{t('breedingPlanner.probSparkCountUpgrade', { count: results.targetSparkCount })}</span>
                                            <span className="prob-calc__result-value">{formatProbability(results.probSparkCountUpgrade)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="prob-calc__disclaimer">
                            <p>{t('breedingPlanner.disclaimerText')}</p>
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
                    <button className="button button--neutral" onClick={onClose}>{t('close', { ns: 'common' })}</button>
                    <button className="button button--primary" onClick={handleCalculate} disabled={isLoading || !pair}>{isLoading ? t('calculating', { ns: 'common' }) + '...' : 'Calculate'}</button>
                </div>
            </Modal>

            <SelectAcquirableSkillsModal
                isOpen={isSkillModalOpen}
                onClose={() => setIsSkillModalOpen(false)}
                allSkills={purchasableSkills}
                selectedIds={acquirableSkillIds}
                onSave={setAcquirableSkillIds}
                pair={pair}
                spBudget={spBudget}
            />

            <SelectConditionalSkillsModal
                isOpen={isConditionalModalOpen}
                onClose={() => setIsConditionalModalOpen(false)}
                allSkills={conditionalSkills}
                selectedIds={conditionalSkillIds}
                onSave={setConditionalSkillIds}
            />
        </>
    );
};

export default ProbabilityCalculatorModal;