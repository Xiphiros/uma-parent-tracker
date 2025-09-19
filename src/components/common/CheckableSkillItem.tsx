import { useAppContext } from '../../context/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import './CheckableSkillItem.css';

interface CheckableSkillItemProps {
    skillName: string;
    isChecked: boolean;
    onToggle: (skillName: string) => void;
}

const CheckableSkillItem = ({ skillName, isChecked, onToggle }: CheckableSkillItemProps) => {
    const { skillMapByName, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const getDisplayName = (name_en: string) => {
        const skill = skillMapByName.get(name_en);
        return skill ? skill[displayNameProp] : name_en;
    };

    const classes = `checkable-skill ${isChecked ? 'checkable-skill--checked' : ''}`;

    return (
        <button className={classes} onClick={() => onToggle(skillName)}>
            {isChecked && <FontAwesomeIcon icon={faCheckCircle} className="checkable-skill__icon" />}
            {getDisplayName(skillName)}
        </button>
    );
};

export default CheckableSkillItem;