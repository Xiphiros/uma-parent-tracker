import './RangeSlider.css';

interface RangeSliderProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

const RangeSlider = ({ label, min, max, value, onChange, disabled = false }: RangeSliderProps) => {
    return (
        <div className="range-slider">
            <div className="range-slider__header">
                <label className="range-slider__label">{label}</label>
                <span className="range-slider__value">{value}+ ★</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                className="range-slider__input"
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
            />
        </div>
    );
};

export default RangeSlider;