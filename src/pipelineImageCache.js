/**
 * IndexedDB cache for pipeline merge PNGs (per username).
 * Replaced entirely after each successful /save or /upload-kml.
 * Cleared when /clear-all succeeds or when explicitly cleared.
 */
import API_URL from "./config";
import { apiHeaders } from "./apiHeaders";

const DB_NAME = "kml_pipeline_merge_images";
const DB_VERSION = 1;
const STORE = "runs";

function buildImageFetchUrl(img, apiBase) {
  const base = (apiBase || "").replace(/\/+$/, "");
  if (img.url && String(img.url).startsWith("/")) {
    return base ? `${base}${img.url}` : `${window.location.origin}${img.url}`;
  }
  if (img.publicUrl && /^https?:\/\//i.test(img.publicUrl)) {
    return img.publicUrl;
  }
  if (img.absolutePath && base) {
    return `${base}/api/public-image?path=${encodeURIComponent(img.absolutePath)}`;
  }
  return null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

/**
 * Remove all cached merge images for this user.
 */
export async function clearPipelineImageCache(username) {
  const u = (username && String(username).trim()) || "local-user";
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(u);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("[pipelineImageCache] clear failed:", e);
  }
}

/**
 * Fetch each merge image and store blobs + metadata under username.
 */
export async function cacheMergeImagesFromServer(mergeImages, username, token) {
  const u = (username && String(username).trim()) || "local-user";
  await clearPipelineImageCache(u);

  if (!mergeImages || mergeImages.length === 0) {
    return { count: 0, username: u };
  }

  const base = (API_URL || "").replace(/\/+$/, "");
  const images = [];

  for (const img of mergeImages) {
    const url = buildImageFetchUrl(img, base);
    if (!url) continue;
    try {
      const res = await fetch(url, { headers: apiHeaders(token, u) });
      if (!res.ok) continue;
      const blob = await res.blob();
      images.push({
        fileName: img.fileName,
        side: img.side,
        lane: img.lane,
        modifiedAt: img.modifiedAt,
        size: blob.size,
        mime: blob.type || "image/png",
        blob,
      });
    } catch (e) {
      console.warn("[pipelineImageCache] fetch failed:", img.fileName, e);
    }
  }

  const record = {
    updatedAt: new Date().toISOString(),
    username: u,
    count: images.length,
    images,
  };

  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record, u);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("[pipelineImageCache] store failed:", e);
  }

  return { count: images.length, username: u };
}

/**
 * Read cached run for further computation (canvas, upload elsewhere, etc.).
 * @returns {Promise<{ updatedAt, username, count, images: Array<{fileName, side, lane, blob, mime, ...}> } | null>}
 */
export async function getCachedPipelineImages(username) {
  const u = (username && String(username).trim()) || "local-user";
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).get(u);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    });
  } catch (e) {
    console.warn("[pipelineImageCache] read failed:", e);
    return null;
  }
}

/**
 * Lightweight list (titles only, no blobs) for UI or API handoff.
 */
export async function listCachedImageTitles(username) {
  const data = await getCachedPipelineImages(username);
  if (!data || !data.images) return [];
  return data.images.map((x) => ({
    fileName: x.fileName,
    side: x.side,
    lane: x.lane,
    modifiedAt: x.modifiedAt,
    size: x.size,
  }));
}
