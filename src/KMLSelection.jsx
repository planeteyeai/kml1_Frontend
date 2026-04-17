import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function KmlOptionCard({
  onGetStarted,
  iconSrc,
  label,
  description,
  cardVariantClass,
}) {
  return (
    <button
      type="button"
      className={`landing-card ${cardVariantClass}`}
      onClick={onGetStarted}
    >
      <div className="landing-card-logo landing-card-logo-inventory">
        <img
          src={iconSrc}
          alt={label}
          className="landing-card-logo-image"
        />
      </div>
      <div className="landing-card-label">{label}</div>
      <div className="landing-card-description">{description}</div>
      <div className="landing-card-footer">
        <span className="landing-card-cta secondary">Get Started</span>
      </div>
    </button>
  );
}

export default function KMLSelection() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-back-button"
            onClick={() => navigate("/")}
          >
            ← Back
          </button>
          <span className="app-header-title">Inventory</span>
        </div>
        <div className="user-info">
          {user && (
            <>
              <span>
                Welcome, <strong>{user.username}</strong>
              </span>
              <button className="logout-button" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex min-h-screen items-start justify-center bg-transparent px-4 pt-16 pb-10">
        <div className="w-full max-w-3xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              Inventory Assets
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Choose which KML generation workflow you want to run.
            </p>
          </div>

          <div className="kml-selection-grid">
            <KmlOptionCard
              iconSrc="/KML_Creation.png"
              label="Continuous Median Divider"
              description="Generate assets from a single KML file."
              cardVariantClass="landing-card-primary"
              onGetStarted={() => navigate("/inventory/kml-1")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

