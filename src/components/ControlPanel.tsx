import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ControlPanel.css';
import GoalDefinition from './GoalDefinition';
import InventoryControls from './common/InventoryControls';

type ActiveTab = 'goal' | 'filters';

const ControlPanel = () => {
  const { t } = useTranslation(['goal', 'roster']);
  const [activeTab, setActiveTab] = useState<ActiveTab>('goal');

  return (
    <div className="control-panel card">
      <div className="control-panel__tabs">
        <button 
          className={`control-panel__tab ${activeTab === 'goal' ? 'control-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('goal')}
        >
          {t('title', { ns: 'goal' })}
        </button>
        <button 
          className={`control-panel__tab ${activeTab === 'filters' ? 'control-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          {t('filtersTitle', { ns: 'roster' })}
        </button>
      </div>
      <div className="control-panel__content">
        {activeTab === 'goal' && <GoalDefinition />}
        {activeTab === 'filters' && <InventoryControls />}
      </div>
    </div>
  );
};

export default ControlPanel;