import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent } from '../../types';
import './SuggestionParentCard.css';
import SparkTag from './SparkTag';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

interface SuggestionParentCardProps {
    parent: Parent;
}

const SuggestionParentCard = ({ parent }: SuggestionParentCardProps) => {
    const { appData, umaMapById, dataDisplayLanguage, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    
    const uma = umaMapById.get(parent.umaId);
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);
    const resolveGrandparent = (gp: Grandparent | undefined) => {
        if (!gp) return null;
        if (typeof gp === 'number') return inventoryMap.get(gp) || null;
        return gp;
    };

    const aggregatedSparks = useMemo(() => {
        const gp1 = resolveGrandparent(parent.grandparent1);
        const gp2 = resolveGrandparent(parent.grandparent2);
        const skillNames = new Set<string>();
        
        const allSparks: { category: 'blue' | 'pink' | 'unique' | 'white', type: string, stars: 1 | 2 | 3, fromParent: boolean }[] = [];

        // Add all of the direct parent's sparks first
        allSparks.push({ category: 'blue', type: parent.blueSpark.type, stars: parent.blueSpark.stars, fromParent: true });
        allSparks.push({ category: 'pink', type: parent.pinkSpark.type, stars: parent.pinkSpark.stars, fromParent: true });
        parent.uniqueSparks.forEach(s => {
            allSparks.push({ category: 'unique', type: s.name, stars: s.stars, fromParent: true });
            skillNames.add(s.name);
        });
        parent.whiteSparks.forEach(s => {
            allSparks.push({ category: 'white', type: s.name, stars: s.stars, fromParent: true });
            skillNames.add(s.name);
        });

        // Add grandparents' sparks if they are unique
        const processGrandparent = (gp: Parent | ManualParentData | null) => {
            if (!gp) return;
            allSparks.push({ category: 'blue', type: gp.blueSpark.type, stars: gp.blueSpark.stars, fromParent: false });
            allSparks.push({ category: 'pink', type: gp.pinkSpark.type, stars: gp.pinkSpark.stars, fromParent: false });
            gp.uniqueSparks.forEach(s => {
                if (!skillNames.has(s.name)) {
                    allSparks.push({ category: 'unique', type: s.name, stars: s.stars, fromParent: false });
                    skillNames.add(s.name);
                }
            });
            if ('whiteSparks' in gp) {
                gp.whiteSparks.forEach(s => {
                    if (!skillNames.has(s.name)) {
                        allSparks.push({ category: 'white', type: s.name, stars: s.stars, fromParent: false });
                        skillNames.add(s.name);
                    }
                });
            }
        };

        processGrandparent(gp1);
        processGrandparent(gp2);

        return allSparks;
    }, [parent, inventoryMap]);

    const getGrandparentImage = (gp: Grandparent | undefined) => {
        const resolved = resolveGrandparent(gp);
        if (resolved?.umaId) {
            return umaMapById.get(resolved.umaId)?.image || null;
        }
        return null;
    };

    const gp1Image = getGrandparentImage(parent.grandparent1);
    const gp2Image = getGrandparentImage(parent.grandparent2);

    return (
        <div className="suggestion-card">
            <div className="suggestion-card__main-info">
                <img src={`${import.meta.env.BASE_URL}${uma?.image}`} alt={uma?.[displayNameProp]} className="suggestion-card__image" />
                <div className="suggestion-card__details">
                    <p className="suggestion-card__name">{uma?.[displayNameProp]}</p>
                    <p className="suggestion-card__score">{parent.score} pts</p>
                </div>
                <div className="suggestion-card__grandparents">
                    {gp1Image && <img src={`${import.meta.env.BASE_URL}${gp1Image}`} className="suggestion-card__gp-image" />}
                    {gp2Image && <img src={`${import.meta.env.BASE_URL}${gp2Image}`} className="suggestion-card__gp-image" />}
                </div>
            </div>
            <div className="suggestion-card__sparks">
                {aggregatedSparks.map(s => (
                    <SparkTag key={`${s.category}-${s.type}`} category={s.category} type={s.category === 'blue' || s.category === 'pink' ? s.type : getSkillDisplayName(s.type)} stars={s.stars}>
                        {s.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                    </SparkTag>
                ))}
            </div>
        </div>
    );
};

export default SuggestionParentCard;