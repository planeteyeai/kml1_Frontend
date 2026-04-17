import React from "react";

export default function InventoryCard({ onGetStarted }) {
  return (
    <button
      type="button"
      className="landing-card landing-card-secondary"
      onClick={onGetStarted}
    >
      <div className="landing-card-logo landing-card-logo-inventory">
        <img
          src="/KML_Creation.png"
          alt="Continuous Median Divider"
          className="landing-card-logo-image"
        />
      </div>
      <div className="landing-card-label">Continuous Median Divider</div>
      <div className="landing-card-description">
        Generate assets from a single KML file.
      </div>
      <div className="landing-card-footer">
        <span className="landing-card-cta secondary">Get Started</span>
      </div>
    </button>
  );
}

