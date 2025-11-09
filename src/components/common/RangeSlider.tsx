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
    const ticks = Array.from({ length: max - min + 1 }, (_, i) => i + min);

    return (
        <div className="range-slider">
            {label && <label className="range-slider__label">{label}</label>}
            <div className="range-slider__input-wrapper">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    className="range-slider__input"
                    onChange={(e) => onChange(Number(e.target.value))}
                    disabled={disabled}
                />
                <div className="range-slider__ticks">
                    {ticks.map(tickValue => (
                        <span key={tickValue} className="range-slider__tick" />
                    ))}
                </div>
            </div>
            <span className="range-slider__value">{value > 0 ? `${value}+ ★` : t('inventory.anyStars')}</span>
        </div>
    );
};

export default RangeSlider;