import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { runRigidPavementDistressScreening } from "./ApiService";

export default function RigidPavementDistressDetection() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lengthKm, setLengthKm] = useState("1.000");
  const [lanes, setLanes] = useState("2");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zipBlob, setZipBlob] = useState(null);
  const [downloadName, setDownloadName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith(".kml")) {
      setErrorMessage("Please upload a valid .kml file.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setErrorMessage("");
    setFile(selected || null);
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const parseAxiosErrorDetail = async (err) => {
    const resp = err && err.response;
    if (!resp) return err?.message || null;

    const data = resp.data;
    if (data instanceof Blob && typeof data.text === "function") {
      const text = await data.text();
      try {
        const json = text ? JSON.parse(text) : null;
        if (json && Array.isArray(json.detail)) {
          return json.detail.map((d) => d?.msg).filter(Boolean).join("; ");
        }
        return json?.detail || json?.message || json?.error || text;
      } catch (_) {
        return text;
      }
    }

    if (typeof data === "string") return data;
    if (data && Array.isArray(data.detail)) {
      return data.detail.map((d) => d?.msg).filter(Boolean).join("; ");
    }
    return data?.detail || data?.message || data?.error || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setZipBlob(null);
    setDownloadName("");

    if (!startDate || !endDate || !file || !lengthKm || !lanes) {
      setErrorMessage("All fields are required.");
      return;
    }

    try {
      setLoading(true);
      const result = await runRigidPavementDistressScreening({
        file,
        startDate,
        endDate,
        lengthKm,
        lanes,
      });

      if (!result || !result.blob) {
        setErrorMessage("No file returned for the selected period.");
        return;
      }

      const filename =
        result.filename ||
        `rigid_distress_${startDate}_to_${endDate}.zip`;

      setZipBlob(result.blob);
      setDownloadName(filename);
      setSuccessMessage(
        "Rigid pavement distress classification finished. ZIP download will start automatically."
      );
      downloadBlob(result.blob, filename);
    } catch (err) {
      const detail = await parseAxiosErrorDetail(err);
      setErrorMessage(
        detail ||
          "Failed to run rigid pavement distress detection. Please check your input and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!zipBlob) return;
    const filename =
      downloadName ||
      `rigid_distress_${startDate || "start"}_to_${endDate || "end"}.zip`;
    downloadBlob(zipBlob, filename);
  };

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
          <span className="app-header-title">Rigid Pavement Distress Detection</span>
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
            <p className="mt-2 text-sm text-slate-300">
              Rigid pavement distress classification — PASS/FAIL with accurate dimensions.
              Upload a KML file and corridor details to generate a ZIP output.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === "function") {
                          e.target.showPicker();
                        }
                      } catch (_) {}
                    }}
                    className="distress-date-input rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === "function") {
                          e.target.showPicker();
                        }
                      } catch (_) {}
                    }}
                    className="distress-date-input rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Length (km)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={lengthKm}
                    onChange={(e) => setLengthKm(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Lanes
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={lanes}
                    onChange={(e) => setLanes(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                  KML File
                </label>
                <input
                  type="file"
                  accept=".kml"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-500"
                  required
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Running..." : "Execute"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!zipBlob}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download ZIP
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
