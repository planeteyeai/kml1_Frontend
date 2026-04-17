import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Per your request:
// - Submit form fields to the LAN API host
// - Download ZIP from the response URL
const SUBMIT_URL = "https://road-assets.up.railway.app/generate-highway-assets";
const RESPONSE_URL = "https://road-assets.up.railway.app/generate-highway-assets";

function isNonNegativeNumber(val) {
  if (val === "" || val === null || val === undefined) return false;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0;
}

function isFiniteNumber(val) {
  if (val === "" || val === null || val === undefined) return false;
  const n = Number(val);
  return Number.isFinite(n);
}

export default function KML1Form() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [file, setFile] = useState(null);
  const [startChainage, setStartChainage] = useState("");
  const [offset, setOffset] = useState("");
  const [lane, setLane] = useState("2");

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generationReady, setGenerationReady] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const downloadName = "highway_assets.zip";

  const canSubmit = useMemo(() => {
    return (
      !!file &&
      isNonNegativeNumber(startChainage) &&
      isFiniteNumber(offset) &&
      lane
    );
  }, [file, startChainage, offset, lane]);

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith(".kml")) {
      setErrorMessage("Please upload a valid .kml file.");
      setFile(null);
      setGenerationReady(false);
      e.target.value = "";
      return;
    }
    setErrorMessage("");
    setFile(selected || null);
    setGenerationReady(false);
  };

  const parseErrorText = async (response) => {
    try {
      const text = await response.text();
      if (!text) return null;
      return text;
    } catch (_) {
      return null;
    }
  };

  const handleDownload = async () => {
    if (!generationReady) return;
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setDownloading(true);

      const buildFormData = () => {
        const fd = new FormData();
        fd.append("file", file);
        // Backend expects `start_chainage_km` (see /docs for generate-highway-assets)
        fd.append("start_chainage_km", startChainage);
        fd.append("offset", String(Number(offset)));
        fd.append("lane", lane);
        return fd;
      };

      const response = await fetch(RESPONSE_URL, {
        method: "POST",
        body: buildFormData(),
      });

      if (!response.ok) {
        const detail = await parseErrorText(response);
        throw new Error(detail || `Request failed with status ${response.status}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(
        "Assets downloaded successfully. Your ZIP should start downloading."
      );
    } catch (err) {
      const msg = (err && err.message) || "";
      if (msg.toLowerCase() === "failed to fetch") {
        setErrorMessage(
          "Download blocked or host unreachable (CORS/network). Check that the backend at the response URL is reachable from the browser."
        );
      } else {
        setErrorMessage(
          msg || "Failed to download assets. Please try again."
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setGenerationReady(false);

    if (!file) {
      setErrorMessage("KML file is required.");
      return;
    }

    if (!isNonNegativeNumber(startChainage)) {
      setErrorMessage("Start Chainage must be a non-negative number (0.0000 allowed).");
      return;
    }

    const offsetNumber = Number(offset);
    if (!isFiniteNumber(offset)) {
      setErrorMessage("Offset must be a valid number (decimal allowed).");
      return;
    }

    if (!lane) {
      setErrorMessage("Lane selection is required.");
      return;
    }

    try {
      setLoading(true);

      const buildFormData = () => {
        const fd = new FormData();
        fd.append("file", file);
        // Backend expects `start_chainage_km` (see /docs for generate-highway-assets)
        fd.append("start_chainage_km", startChainage);
        fd.append("offset", String(offsetNumber));
        fd.append("lane", lane);
        return fd;
      };

      const submitRes = await fetch(SUBMIT_URL, {
        method: "POST",
        body: buildFormData(),
      });

      if (!submitRes.ok) {
        const detail = await parseErrorText(submitRes);
        throw new Error(detail || `Request failed with status ${submitRes.status}`);
      }

      setGenerationReady(true);
      setSuccessMessage(
        "Assets generation request sent successfully. Click Download Assets once ready."
      );
    } catch (err) {
      const msg = (err && err.message) || "";
      if (msg.toLowerCase() === "failed to fetch") {
        setErrorMessage(
          "Request blocked or host unreachable (CORS/network). Check that the backend at the configured URLs is reachable from the browser and allows CORS for http://localhost:3000."
        );
      } else {
        setErrorMessage(
          msg ||
            "Failed to generate assets. Please check inputs and try again."
        );
      }
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
          <span className="app-header-title">Continuous Median Divider</span>
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
              Continuous Median Divider
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Upload a KML and generate highway assets with your chainage, offset and lane.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                  Upload KML
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:bg-slate-900">
                  <span className="truncate">{file ? file.name : "Choose .kml file"}</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 shadow-lg shadow-cyan-500/20">
                    Browse
                  </span>
                  <input
                    type="file"
                    accept=".kml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-slate-400">Supported format: .kml only</p>
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
                    onChange={(e) => {
                      setStartChainage(e.target.value);
                      setGenerationReady(false);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Offset
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={offset}
                    step="any"
                    onChange={(e) => {
                      setOffset(e.target.value);
                      setGenerationReady(false);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                  Lane
                </label>
                <select
                  value={lane}
                    onChange={(e) => {
                      setLane(e.target.value);
                      setGenerationReady(false);
                    }}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="6">6</option>
                </select>
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
                  disabled={loading || downloading || !canSubmit}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-400/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
                >
                  {(loading || downloading) && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-100 border-t-transparent" />
                  )}
                  Generate Assets
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!generationReady || loading || downloading}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600/80 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                >
                  {downloading && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-100 border-t-transparent" />
                  )}
                  Download Assets
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

