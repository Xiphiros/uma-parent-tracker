import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent } from '../../types';
import SelectionSlot from './SelectionSlot';
import './LineageDisplay.css';

interface LineageDisplayProps {
    label: string;
    parent: Parent | null;
    onClick: () => void;
    onClear: () => void;
}

const LineageDisplay = ({ label, parent, onClick, onClear }: LineageDisplayProps) => {
    const { appData, umaMapById, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const getGrandparentData = (gp: Grandparent | undefined): { name: string; image?: string | null } | null => {
        if (!gp) return null;

        let umaId: string | undefined;
        let manualName: string | undefined;

        if (typeof gp === 'number') {
            const ownedParent = appData.inventory.find(p => p.id === gp);
            umaId = ownedParent?.umaId;
        } else { // ManualParentData
            umaId = (gp as ManualParentData).umaId;
            if (!umaId) manualName = 'Manual Entry';
        }

        if (umaId) {
            const uma = umaMapById.get(umaId);
            return { name: uma?.[displayNameProp] || 'Unknown', image: uma?.image || null };
        }

        return { name: manualName || 'Unknown', image: null };
    };
    
    const parentData = parent ? {
        name: umaMapById.get(parent.umaId)?.[displayNameProp] || parent.name,
        image: umaMapById.get(parent.umaId)?.image || null
    } : null;

    const gp1Data = parent ? getGrandparentData(parent.grandparent1) : null;
    const gp2Data = parent ? getGrandparentData(parent.grandparent2) : null;

    return (
        <div className="lineage-display">
            <SelectionSlot label={label} selectedItem={parentData} onClick={onClick} onClear={onClear} />
            <div className="lineage-display__grandparents">
                <div className="lineage-display__gp-slot">
                    {gp1Data ? (
                        <>
                            <img src={gp1Data.image ? `${import.meta.env.BASE_URL}${gp1Data.image}` : undefined} alt={gp1Data.name} className="lineage-display__gp-image" />
                            <span className="lineage-display__gp-name">{gp1Data.name}</span>
                        </>
                    ) : <span className="lineage-display__gp-placeholder">-</span>}
                </div>
                 <div className="lineage-display__gp-slot">
                    {gp2Data ? (
                        <>
                            <img src={gp2Data.image ? `${import.meta.env.BASE_URL}${gp2Data.image}` : undefined} alt={gp2Data.name} className="lineage-display__gp-image" />
                            <span className="lineage-display__gp-name">{gp2Data.name}</span>
                        </>
                    ) : <span className="lineage-display__gp-placeholder">-</span>}
                </div>
            </div>
        </div>
    );
};

export default LineageDisplay;