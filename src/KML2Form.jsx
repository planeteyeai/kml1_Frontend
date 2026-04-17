import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function isNonNegativeNumber(val) {
  if (val === "" || val === null || val === undefined) return false;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0;
}

export default function KML2Form() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [fileLhs, setFileLhs] = useState(null);
  const [fileRhs, setFileRhs] = useState(null);
  const [startChainage, setStartChainage] = useState("");
  const [lane, setLane] = useState("2");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChangeLhs = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith(".kml")) {
      setErrorMessage("Please upload a valid .kml file for KML (LHS).");
      setFileLhs(null);
      e.target.value = "";
      return;
    }
    setErrorMessage("");
    setFileLhs(selected || null);
  };

  const handleFileChangeRhs = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith(".kml")) {
      setErrorMessage("Please upload a valid .kml file for KML (RHS).");
      setFileRhs(null);
      e.target.value = "";
      return;
    }
    setErrorMessage("");
    setFileRhs(selected || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!fileLhs || !fileRhs) {
      setErrorMessage("Both KML (LHS) and KML (RHS) files are required.");
      return;
    }

    if (!isNonNegativeNumber(startChainage)) {
      setErrorMessage("Start Chainage must be a non-negative number (0.0000 allowed).");
      return;
    }

    if (!lane) {
      setErrorMessage("Lane selection is required.");
      return;
    }

    try {
      setLoading(true);
      // No API integration required yet for KML-2.
      setSuccessMessage("KML - 2 submission saved. API integration will be enabled next.");
    } catch (_) {
      setErrorMessage("Failed to submit KML - 2 form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-back-button"
            onClick={() => navigate("/inventory")}
          >
            ← Back
          </button>
          <span className="app-header-title">KML - 2</span>
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
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              KML - 2 Asset Generator
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Upload two KML files and configure start chainage and lane.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    KML (LHS)
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:bg-slate-900">
                    <span className="truncate">
                      {fileLhs ? fileLhs.name : "Choose .kml file"}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 shadow-lg shadow-cyan-500/20">
                      Browse
                    </span>
                    <input
                      type="file"
                      accept=".kml"
                      onChange={handleFileChangeLhs}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    KML (RHS)
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:bg-slate-900">
                    <span className="truncate">
                      {fileRhs ? fileRhs.name : "Choose .kml file"}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 shadow-lg shadow-cyan-500/20">
                      Browse
                    </span>
                    <input
                      type="file"
                      accept=".kml"
                      onChange={handleFileChangeRhs}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Start Chainage
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={startChainage}
                    min="0"
                    step="any"
                    onChange={(e) => setStartChainage(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Lane
                  </label>
                  <select
                    value={lane}
                    onChange={(e) => setLane(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                  >
                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-600/60 bg-red-900/40 px-3 py-2 text-xs text-red-100">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-emerald-600/60 bg-emerald-900/40 px-3 py-2 text-xs text-emerald-100">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-400/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
                >
                  {loading && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-100 border-t-transparent" />
                  )}
                  Submit KML - 2
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

