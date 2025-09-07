import { ReactNode } from 'react';
import { formatStars } from '../../utils/ui';
import './SparkTag.css';

type SparkCategory = 'blue' | 'pink' | 'unique' | 'white';

interface SparkTagProps {
    category: SparkCategory;
    type: string; // e.g., "Speed", "Turf", or the skill name for unique/white
    stars: number;
    children?: ReactNode; // To hold extra info like tier
}

const SparkTag = ({ category, type, stars, children }: SparkTagProps) => {
    // Sanitize type for data-attribute, e.g., "Front Runner" -> "front-runner"
    const dataType = type.toLowerCase().replace(/ /g, '-');

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