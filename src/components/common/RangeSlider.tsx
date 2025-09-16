import './RangeSlider.css';
import { useTranslation } from 'react-i18next';

interface RangeSliderProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

const RangeSlider = ({ label, min, max, value, onChange, disabled = false }: RangeSliderProps) => {
    const { t } = useTranslation('roster');
    return (
        <div className="range-slider">
            {label && <label className="range-slider__label">{label}</label>}
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                className="range-slider__input"
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
            />
            <span className="range-slider__value">{value > 0 ? `${value}+ ★` : t('inventory.anyStars')}</span>
        </div>
    );
};

export default RangeSlider;