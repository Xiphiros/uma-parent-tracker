import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent } from '../../types';
import './LineageTree.css';
import { useTranslation } from 'react-i18next';

interface LineageTreeProps {
    parent: Parent;
}

const LineageTree = ({ parent }: LineageTreeProps) => {
    const { t } = useTranslation('roster');
    const { appData, umaMapById, getIndividualScore } = useAppContext();
    const inventoryMap = new Map(appData.inventory.map((p: Parent) => [p.id, p]));

    const getGrandparent = (gpRef: Grandparent | undefined): Parent | ManualParentData | null => {
        if (!gpRef) return null;
        if (typeof gpRef === 'number') return inventoryMap.get(gpRef) || null;
        return gpRef;
    };

    const parentAvatar = parent?.umaId ? umaMapById.get(parent.umaId)?.image : null;
    const gp1 = getGrandparent(parent.grandparent1);
    const gp2 = getGrandparent(parent.grandparent2);
    
    const gp1Avatar = gp1?.umaId ? umaMapById.get(gp1.umaId)?.image : null;
    const gp2Avatar = gp2?.umaId ? umaMapById.get(gp2.umaId)?.image : null;

    const renderAvatar = (src: string | null | undefined, size: 'parent' | 'grandparent', entity: Parent | ManualParentData | null) => {
        const score = entity ? getIndividualScore(entity) : 0;
        const tooltip = entity ? t('parentCard.individualScoreTooltip', { score }) : '';
        const finalSrc = src ? `${import.meta.env.BASE_URL}${src}` : 'https://via.placeholder.com/80';
        
        return (
            <img
                src={finalSrc}
                className={`lineage-tree__avatar lineage-tree__avatar--${size}`}
                alt=""
                title={tooltip}
            />
        );
    };

    return (
        <div className="lineage-tree">
            <div className="lineage-tree__parent">
                {renderAvatar(parentAvatar, 'parent', parent)}
            </div>
            {(gp1 || gp2) && (
                <div className="lineage-tree__grandparents">
                    {renderAvatar(gp1Avatar, 'grandparent', gp1)}
                    {renderAvatar(gp2Avatar, 'grandparent', gp2)}
                </div>
            )}
        </div>
    );
};

export default LineageTree;