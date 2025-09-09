import { ReactNode } from 'react';
import { formatStars } from '../../utils/ui';
import './SparkTag.css';

type SparkCategory = 'blue' | 'pink' | 'unique' | 'white';

interface SparkTagProps {
    category: SparkCategory;
    type: string; // The translated name for display
    stars: number;
    children?: ReactNode; // To hold extra info like tier
    originalType?: string; // The canonical, untranslated type for data attributes
}

const SparkTag = ({ category, type, stars, children, originalType }: SparkTagProps) => {
    // Sanitize type for data-attribute, e.g., "Front Runner" -> "front-runner"
    // Use the original, untranslated type for a stable data-attribute for CSS.
    const dataType = (originalType || type).toLowerCase().replace(/ /g, '-');

    return (
        <div 
            className="spark-tag" 
            data-spark-category={category} 
            data-spark-type={category === 'blue' || category === 'pink' ? dataType : undefined}
        >
            {type} {formatStars(stars)}
            {children}
        </div>
    );
};

export default SparkTag;