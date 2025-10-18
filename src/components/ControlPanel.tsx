import React from 'react';
import './ControlPanel.css';

const ControlPanel = () => {
  return (
    <div className="control-panel card">
      <div className="control-panel__tabs">
        <button className="control-panel__tab control-panel__tab--active">
          Define Goal
        </button>
        <button className="control-panel__tab">
          Filters
        </button>
      </div>
      <div className="control-panel__content">
        {/* Content will go here in a future step */}
      </div>
    </div>
  );
};

export default ControlPanel;