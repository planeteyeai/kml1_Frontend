import axios from "axios";
import API_URL from "./config";
import JSZip from "jszip";

const DISTRESS_CLONE_BASE = "https://web-production-aad6d.up.railway.app";
const DISTRESS_CLONE2_BASE = "https://distress-clone2.up.railway.app";
const FINAL_DISTRESS_DETECTION_BASE = "https://distresssemifinal.up.railway.app";

function getFilenameFromContentDisposition(headers, fallback) {
  const cd =
    (headers && headers["content-disposition"]) ||
    (headers && headers.get && headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        return match[1].replace(/"/g, "").trim();
      }
    }
  }
  return fallback;
}

async function removeFilesFromZipBlob(zipBlob, shouldRemove) {
  const zip = await JSZip.loadAsync(zipBlob);
  Object.keys(zip.files).forEach((name) => {
    if (shouldRemove(name)) {
      zip.remove(name);
    }
  });
  return await zip.generateAsync({ type: "blob" });
}

export async function generateDistressReport({ file, startDate, endDate, projectName }) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);
  if (projectName) params.set("project_name", projectName);

  const formData = new FormData();
  formData.append("file", file);

  const query = params.toString();
  const url = `${API_URL}/api/distress-report${query ? `?${query}` : ""}`;

  const response = await axios.post(url, formData, {
    responseType: "blob",
  });
  const filename = getFilenameFromContentDisposition(
    response.headers,
    "distress_report.xlsx"
  );
  return { blob: response.data, filename };
}

export async function runRoadAnomalyScreening({
  file,
  startDate,
  endDate,
  lengthKm,
  lanes,
}) {
  const formData = new FormData();
  if (file) {
    try {
      const kmlFile = new File([file], file.name, {
        type: "application/vnd.google-earth.kml+xml",
      });
      formData.append("kml_file", kmlFile);
    } catch (_) {
      formData.append("kml_file", file);
    }
  }
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);
  if (lengthKm !== undefined && lengthKm !== null && lengthKm !== "") {
    formData.append("length_km", String(lengthKm));
  }
  if (lanes !== undefined && lanes !== null && lanes !== "") {
    formData.append("lanes", String(lanes));
  }

  const response = await axios.post(`${FINAL_DISTRESS_DETECTION_BASE}/analyse`, formData, {
    responseType: "blob",
    headers: {
      Accept: "application/zip, application/octet-stream, application/json",
    },
  });

  const filename = getFilenameFromContentDisposition(
    response.headers,
    `road_anomaly_results_${startDate || "start"}_to_${endDate || "end"}.zip`
  );
  return { blob: response.data, filename };
}

// Distress Report (clone): POST /detect, then GET /download-all (zip)
export async function generateDistressReportClone({ file, startDate, endDate }) {
  const formData = new FormData();
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);

  if (file) {
    // API expects field name 'kml' for the upload
    try {
      const kmlFile = new File([file], file.name, {
        type: "application/vnd.google-earth.kml+xml",
      });
      formData.append("kml", kmlFile);
    } catch (_) {
      formData.append("kml", file);
    }
  }

  // 1) Trigger processing
  await axios.post(`${DISTRESS_CLONE_BASE}/detect`, formData, {
    headers: { Accept: "application/json" },
  });

  // 2) Download zip output (poll until backend finishes)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tryDownload = async () => {
    const resp = await axios.get(`${DISTRESS_CLONE_BASE}/download-all`, {
      responseType: "blob",
      headers: { Accept: "application/zip, application/octet-stream" },
      validateStatus: () => true, // we handle status manually for polling
    });

    // Not ready yet (common patterns)
    if (resp.status === 202 || resp.status === 404) return null;
    if (resp.status >= 400) {
      // If backend returns JSON error as blob, surface it
      const ct = (resp.headers && resp.headers["content-type"]) || "";
      if (ct.includes("application/json") && resp.data && typeof resp.data.text === "function") {
        const text = await resp.data.text();
        throw new Error(text || `Download failed (${resp.status})`);
      }
      throw new Error(`Download failed (${resp.status})`);
    }

    // Sometimes backend returns JSON "not ready" as 200; detect and keep polling
    const ct = (resp.headers && resp.headers["content-type"]) || "";
    if (ct.includes("application/json") && resp.data && typeof resp.data.text === "function") {
      const text = await resp.data.text();
      const lower = String(text || "").trim().toLowerCase();
      if (lower.includes("not ready") || lower.includes("processing") || lower.includes("wait")) {
        return null;
      }
      throw new Error(text || "Unexpected JSON response from download endpoint");
    }

    const filename = getFilenameFromContentDisposition(resp.headers, "distress_report.zip");
    let blob = resp.data;

    // Remove geojson + csv from the downloaded zip (client-side)
    try {
      blob = await removeFilesFromZipBlob(blob, (name) => {
        const lower = String(name || "").toLowerCase();
        return lower.endsWith(".geojson") || lower.endsWith(".csv");
      });
    } catch (_) {
      // If zip manipulation fails, fall back to original backend zip
    }

    return { blob, filename };
  };

  // up to ~90s total (quick start, then slower)
  const delays = [400, 600, 800, 1200, 1500, 2000, 2500, 3000, 3500, 4000];
  for (let i = 0; i < delays.length; i++) {
    const res = await tryDownload();
    if (res) return res;
    await sleep(delays[i]);
  }
  throw new Error("ZIP not ready yet. Please try again in a few seconds.");
}

export async function generateDistressReportClone2({ file, startDate, endDate }) {
  const formData = new FormData();
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);

  if (file) {
    try {
      const kmlFile = new File([file], file.name, {
        type: "application/vnd.google-earth.kml+xml",
      });
      formData.append("roi_kml", kmlFile);
    } catch (_) {
      formData.append("roi_kml", file);
    }
  }

  const response = await axios.post(`${DISTRESS_CLONE2_BASE}/screen`, formData, {
    responseType: "blob",
    headers: {
      Accept: "application/json",
    },
  });

  const contentType = String(
    (response.headers && response.headers["content-type"]) || ""
  ).toLowerCase();

  // Handle APIs that return downloadable ZIP directly in response.
  if (
    contentType.includes("application/zip") ||
    contentType.includes("application/octet-stream")
  ) {
    const filename = getFilenameFromContentDisposition(
      response.headers,
      "distress_report_clone2.zip"
    );
    return { blob: response.data, filename };
  }

  // Handle APIs that return JSON metadata with a separate file URL or base64 payload.
  if (contentType.includes("application/json") && response.data?.text) {
    const raw = await response.data.text();
    const payload = raw ? JSON.parse(raw) : {};

    const maybeUrl =
      payload?.download_url ||
      payload?.downloadUrl ||
      payload?.zip_url ||
      payload?.zipUrl ||
      payload?.url ||
      payload?.file_url;

    if (maybeUrl) {
      const downloadResp = await axios.get(maybeUrl, {
        responseType: "blob",
        headers: { Accept: "application/zip, application/octet-stream" },
      });
      const filename = getFilenameFromContentDisposition(
        downloadResp.headers,
        "distress_report_clone2.zip"
      );
      return { blob: downloadResp.data, filename };
    }

    const maybeBase64 = payload?.zip_base64 || payload?.zipBase64;
    if (maybeBase64) {
      const binary = atob(maybeBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/zip" });
      return { blob, filename: "distress_report_clone2.zip" };
    }

    throw new Error(
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      "Clone 2 API did not return a downloadable ZIP."
    );
  }

  return {
    blob: response.data,
    filename: getFilenameFromContentDisposition(
      response.headers,
      "distress_report_clone2.zip"
    ),
  };
}

export async function getDistressPredictedJson({ startDate, endDate, projectName }) {
  const base = "https://distress-kml.up.railway.app";
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);
  const url = `${base}/road-distressSinglepipeline?${params.toString()}`;
  const response = await axios.get(url);
  return response.data;
}

export async function registerFarmerGrapes(payload) {
  const url = "http://192.168.42.103:8000/api/farms/register-farmer/grapes/";
  const isFormData = payload instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : { headers: { "Content-Type": "application/json" } };
  const response = await axios.post(url, payload, config);
  return response.data;
}

export async function generateDistressPredicted({ file, startDate, endDate, projectName }) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);

  const formData = new FormData();
  formData.append("file", file);

  const query = params.toString();
  const url = `${API_URL}/api/distress-predicted${query ? `?${query}` : ""}`;

  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers && response.headers.get && response.headers.get("content-disposition"));
  let filename = "distress_predicted.xlsx";
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}

export async function downloadDetectPredictedDistressCombined({
  file,
  startDate,
  endDate,
  projectName,
}) {
  const formData = new FormData();
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);
  if (projectName) formData.append("project_name", projectName);
  if (file) {
    try {
      const kmlFile = new File([file], file.name, {
        type: "application/vnd.google-earth.kml+xml",
      });
      formData.append("kml", kmlFile);
    } catch (_) {
      formData.append("kml", file);
    }
  }
  const url = `https://distress-kml.up.railway.app/detect-distress-final_predicted/`;
  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  let filename = "distress_predicted.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers && response.headers.get && response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}

export async function generateDistressFullpipelineProxy({
  file,
  startDate,
  endDate,
  projectName,
}) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);

  const formData = new FormData();
  if (file) formData.append("file", file);
  const url = `${API_URL}/api/distress-fullpipeline?${params.toString()}`;
  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  let filename = "distress_report.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers &&
      response.headers.get &&
      response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}

// Direct call to Railway Fullpipeline (fallback if proxy is unavailable)
export async function generateDistressFullpipelineDirect({
  file,
  startDate,
  endDate,
  projectName,
}) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const query = params.toString();

  const postUrlPrimary = `https://distress-kml.up.railway.app/road-distress-fullpipeline_reported${query ? `?${query}` : ""}`;
  const postUrlFallback = `https://distress-kml.up.railway.app/road-distress-fullpipeline/${query ? `?${query}` : ""}`;
  const dlUrlPrimary = `https://distress-kml.up.railway.app/road-distress-fullpipeline_reported?${query}`;
  const dlUrlFallback = `https://distress-kml.up.railway.app/road-distress-fullpipeline?${query}`;

  const formData = new FormData();
  if (projectName) formData.append("project_name", projectName);
  if (file) formData.append("file", file);

  // 1) Try POST to primary; ignore redirect/CORS errors and continue
  try {
    await axios.post(postUrlPrimary, formData, {
      headers: {
        Accept: "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (_) {
    // 2) Try POST to fallback
    try {
      await axios.post(postUrlFallback, formData, {
        headers: {
          Accept: "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    } catch (__) { }
  }

  // 3) Poll GET download endpoint until file is ready (up to 3 attempts)
  const tryDownload = async (url) => {
    const resp = await axios.get(url, {
      responseType: "blob",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
    let filename = "distress_report.xlsx";
    const cd =
      (resp.headers && resp.headers["content-disposition"]) ||
      (resp.headers && resp.headers.get && resp.headers.get("content-disposition"));
    if (cd && typeof cd === "string") {
      const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
        } catch (_) {
          filename = match[1].replace(/"/g, "").trim();
        }
      }
    }
    return { blob: resp.data, filename };
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 2; i++) {
    try {
      return await tryDownload(dlUrlPrimary);
    } catch (e1) {
      try {
        return await tryDownload(dlUrlFallback);
      } catch (e2) {
        if (i < 1) await sleep(1200);
      }
    }
  }
  throw new Error("Download endpoint not ready after processing");
}

export async function downloadDetectDistressFinalPredicted({
  file,
  startDate,
  endDate,
  projectName,
}) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);

  const formData = new FormData();
  if (file) {
    try {
      const kmlFile = new File([file], file.name, {
        type: "application/vnd.google-earth.kml+xml",
      });
      formData.append("kml", kmlFile);
    } catch (_) {
      formData.append("kml", file);
    }
  }
  const url = `https://distress-kml.up.railway.app/detect-distress-final_predicted/?${params.toString()}`;
  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  let filename = "distress_predicted_final.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers &&
      response.headers.get &&
      response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}

export async function generateDistressFinalPredictedProxy({
  file,
  startDate,
  endDate,
  projectName,
}) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);
  const formData = new FormData();
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);
  if (projectName) formData.append("project_name", projectName);
  if (file) formData.append("file", file);
  const url = `${API_URL}/api/distress-final-predicted${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  let filename = "distress_predicted_final.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers &&
      response.headers.get &&
      response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}
export async function triggerDistressFullpipeline({ file, startDate, endDate, projectName }) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (projectName) params.set("project_name", projectName);

  const formData = new FormData();
  if (file) formData.append("file", file);
  const primary = `https://distress-kml.up.railway.app/road-distress-fullpipeline_reported?${params.toString()}`;
  const fallback = `https://distress-kml.up.railway.app/road-distress-fullpipeline/?${params.toString()}`;
  try {
    const res = await axios.post(primary, formData);
    return res.data;
  } catch (err) {
    try {
      const res2 = await axios.post(fallback, formData);
      return res2.data;
    } catch (e2) {
      throw err;
    }
  }
}

export async function downloadDistressFullpipeline({ startDate, endDate }) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const primary = `https://distress-kml.up.railway.app/road-distress-fullpipeline_reported?${params.toString()}`;
  const fallback = `https://distress-kml.up.railway.app/road-distress-fullpipeline?${params.toString()}`;
  let response;
  try {
    response = await axios.get(primary, {
      responseType: "blob",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (err) {
    response = await axios.get(fallback, {
      responseType: "blob",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
  let filename = "distress_report.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers && response.headers.get && response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}
