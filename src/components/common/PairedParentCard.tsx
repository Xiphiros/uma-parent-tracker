import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Parent } from '../../types';
import SparkTag from './SparkTag';
import { useTranslation } from 'react-i18next';
import './PairedParentCard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';

interface PairedParentCardProps {
    parent: Parent;
    onDetailsClick: () => void;
}

const PairedParentCard = ({ parent, onDetailsClick }: PairedParentCardProps) => {
    const { t } = useTranslation(['roster', 'game']);
    const { umaMapById, dataDisplayLanguage, getActiveProfile } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const primarySparks = useMemo(() => {
        const sparks = [];
        if (goal?.primaryBlue.includes(parent.blueSpark.type)) {
            sparks.push({ ...parent.blueSpark, category: 'blue' as const });
        }
        if (goal?.primaryPink.includes(parent.pinkSpark.type)) {
            sparks.push({ ...parent.pinkSpark, category: 'pink' as const });
        }
        return sparks;
    }, [goal, parent.blueSpark, parent.pinkSpark]);
    
    return (
        <div className="paired-parent-card">
            <div className="paired-parent-card__header">
                <img src={`${import.meta.env.BASE_URL}${umaData?.image}`} alt={displayName} className="paired-parent-card__avatar" />
                <div className="paired-parent-card__details">
                    <div className="paired-parent-card__name">
                        <span>{displayName}</span>
                        {parent.isBorrowed && <span className="parent-card__borrowed-tag">{t('parentCard.borrowed')}</span>}
                    </div>
                    <div className="paired-parent-card__score">{parent.score} {t('parentCard.pts')}</div>
                </div>
                 <button className="paired-parent-card__details-btn" onClick={onDetailsClick} title={t('parentCard.details')}>
                    <FontAwesomeIcon icon={faEllipsis} />
                </button>
            </div>
            <div className="paired-parent-card__body">
                <div className="paired-parent-card__sparks">
                    <SparkTag category="blue" type={t(parent.blueSpark.type, { ns: 'game' })} stars={parent.blueSpark.stars} originalType={parent.blueSpark.type} />
                    <SparkTag category="pink" type={t(parent.pinkSpark.type, { ns: 'game' })} stars={parent.pinkSpark.stars} originalType={parent.pinkSpark.type} />
                     {primarySparks.map(spark => (
                        <SparkTag key={spark.type} category={spark.category} type={t(spark.type, { ns: 'game' })} stars={spark.stars} originalType={spark.type} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PairedParentCard;