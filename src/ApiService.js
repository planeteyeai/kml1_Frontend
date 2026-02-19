import axios from "axios";
import API_URL from "./config";

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
  let filename = "distress_report.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers && response.headers.get && response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
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
    const match = cd.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
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
      formData.append("file", kmlFile);
    } catch (_) {
      formData.append("file", file);
    }
  }
  const url = `https://distress-kml.up.railway.app/detect-distress-final_predicted/?${params.toString()}`;
  const response = await axios.post(url, formData, {
    responseType: "blob",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  let filename = "distress_predicted.xlsx";
  const cd =
    (response.headers && response.headers["content-disposition"]) ||
    (response.headers && response.headers.get && response.headers.get("content-disposition"));
  if (cd && typeof cd === "string") {
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
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
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
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
      const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
        } catch (_) {
          filename = match[1].replace(/\"/g, "").trim();
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
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
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
  if (file) formData.append("file", file);
  const url = `${API_URL}/api/distress-final-predicted?${params.toString()}`;
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
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
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
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/\"/g, "").trim());
      } catch (_) {
        filename = match[1].replace(/\"/g, "").trim();
      }
    }
  }
  return { blob: response.data, filename };
}
