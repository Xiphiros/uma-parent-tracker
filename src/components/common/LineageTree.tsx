import { useAppContext } from '../../context/AppContext';
import { Grandparent, Parent } from '../../types';
import './LineageTree.css';

interface LineageTreeProps {
    parent: Parent;
}

const LineageTree = ({ parent }: LineageTreeProps) => {
    const { appData, umaMapById } = useAppContext();

    const getAvatar = (gp: Grandparent | Parent): string | null => {
        let umaId: string | undefined;
        if (typeof gp === 'number') {
            const ownedParent = appData.inventory.find(p => p.id === gp);
            umaId = ownedParent?.umaId;
        } else if ('umaId' in gp) {
            umaId = gp.umaId;
        }
        
        if (umaId) {
            const umaData = umaMapById.get(umaId);
            return umaData?.image ? `${import.meta.env.BASE_URL}${umaData.image}` : null;
        }
        return null;
    };

    const parentAvatar = getAvatar(parent);
    const gp1Avatar = parent.grandparent1 ? getAvatar(parent.grandparent1) : null;
    const gp2Avatar = parent.grandparent2 ? getAvatar(parent.grandparent2) : null;
    
    const renderAvatar = (src: string | null, size: 'parent' | 'grandparent') => (
        <img
            src={src || 'https://via.placeholder.com/80'}
            className={`lineage-tree__avatar lineage-tree__avatar--${size}`}
            alt=""
        />
    );

    return (
        <div className="lineage-tree">
            <div className="lineage-tree__parent">
                {renderAvatar(parentAvatar, 'parent')}
            </div>
            {(gp1Avatar || gp2Avatar) && (
                <div className="lineage-tree__grandparents">
                    {renderAvatar(gp1Avatar, 'grandparent')}
                    {renderAvatar(gp2Avatar, 'grandparent')}
                </div>
            )}
        </div>
    );
};

export default LineageTree;