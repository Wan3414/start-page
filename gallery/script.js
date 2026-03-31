const THEME_STORAGE_KEY = "wan-start-page-theme";
const API_BASE_STORAGE_KEY = "wan-start-page-api-base";
const AUTH_TOKEN_STORAGE_KEY = "wan-start-page-auth-token";
const AUTH_USER_STORAGE_KEY = "wan-start-page-auth-user";

const galleryGrid = document.getElementById("galleryGrid");
const galleryUploadInput = document.getElementById("galleryUploadInput");
const galleryUploadButton = document.getElementById("galleryUploadButton");
const galleryDeleteButton = document.getElementById("galleryDeleteButton");
const galleryReloadButton = document.getElementById("galleryReloadButton");
const galleryStatusText = document.getElementById("galleryStatusText");
const galleryLightbox = document.getElementById("galleryLightbox");
const galleryLightboxImage = document.getElementById("galleryLightboxImage");
const galleryLightboxCaption = document.getElementById("galleryLightboxCaption");
const galleryLightboxTitle = document.getElementById("galleryLightboxTitle");
const galleryLightboxClose = document.getElementById("galleryLightboxClose");

let authToken = "";
let authUser = null;
let galleryItems = [];
let activeGalleryItemId = null;

function normalizeApiBase(value) {
  return value.trim().replace(/\/+$/, "");
}

function getDefaultApiBase() {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return `${protocol}//${hostname}:8000`;
  }
  return "";
}

function getApiBase() {
  try {
    return normalizeApiBase(window.localStorage.getItem(API_BASE_STORAGE_KEY) || "") || getDefaultApiBase();
  } catch (error) {
    return getDefaultApiBase();
  }
}

function resolveApiFileUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return value;
  }

  return `${apiBase}${value.startsWith("/") ? value : `/${value}`}`;
}

function getTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch (error) {
    return "dark";
  }
}

function restoreAuth() {
  try {
    authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    authUser = rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    authToken = "";
    authUser = null;
  }
}

function getAuthHeaders() {
  const headers = {
    Accept: "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: options.method || "GET",
    headers: {
      ...getAuthHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawText = await response.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const errorMessage = (data && (data.detail || data.message)) || `HTTP ${response.status}`;
    const requestError = new Error(errorMessage);
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }

  return data;
}

async function apiUpload(path, fieldName, file, extraFields = {}) {
  const formData = new FormData();
  formData.append(fieldName, file);
  Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value));

  const response = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  const rawText = await response.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const errorMessage = (data && (data.detail || data.message)) || `HTTP ${response.status}`;
    const requestError = new Error(errorMessage);
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }

  return data;
}

function setStatus(message) {
  if (galleryStatusText) {
    galleryStatusText.textContent = message;
  }
}

function renderGallery() {
  if (!galleryGrid) {
    return;
  }

  if (!authToken || !authUser || authUser.is_guest) {
    galleryGrid.innerHTML = '<div class="gallery-empty liquid-panel">请先用正式账号登录，再进入个人图库。</div>';
    return;
  }

  if (galleryItems.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-empty liquid-panel">当前图库为空，先上传一张图片。</div>';
    return;
  }

  galleryGrid.innerHTML = galleryItems
    .map((item) => {
      const activeClass = item.id === activeGalleryItemId ? " is-active" : "";
      return `
        <article class="gallery-card liquid-panel${activeClass}" data-id="${item.id}">
          <img class="gallery-card-image" src="${resolveApiFileUrl(item.file_url_with_token || item.file_url)}" alt="${item.original_name || "gallery image"}" />
          <h2 class="gallery-card-title">${item.original_name || "未命名图片"}</h2>
          <p class="gallery-card-meta">${item.caption || "没有备注"}</p>
          <div class="gallery-card-actions">
            <button class="gallery-card-button" type="button" data-action="preview">预览</button>
          </div>
        </article>
      `;
    })
    .join("");

  galleryGrid.querySelectorAll(".gallery-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      const itemId = Number(card.dataset.id || "0");
      const previewButton = event.target.closest('[data-action="preview"]');
      activeGalleryItemId = itemId;
      renderGallery();
      const activeItem = galleryItems.find((entry) => entry.id === itemId);
      setStatus(
        activeItem
          ? `已选中：${activeItem.original_name || "未命名图片"}`
          : "已选中一张图片。"
      );
      if (previewButton) {
        openLightbox(itemId);
      }
    });
    card.addEventListener("dblclick", () => {
      const itemId = Number(card.dataset.id || "0");
      activeGalleryItemId = itemId;
      renderGallery();
      openLightbox(itemId);
    });
  });
}

function openLightbox(itemId) {
  const item = galleryItems.find((entry) => entry.id === itemId);
  if (!item || !galleryLightbox || !galleryLightboxImage || !galleryLightboxCaption || !galleryLightboxTitle) {
    return;
  }

  galleryLightboxTitle.textContent = item.original_name || "图片预览";
  galleryLightboxImage.src = resolveApiFileUrl(item.file_url_with_token || item.file_url);
  galleryLightboxImage.alt = item.original_name || "gallery image";
  galleryLightboxCaption.textContent = item.caption || "没有备注";
  galleryLightbox.classList.add("is-open");
  galleryLightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!galleryLightbox) {
    return;
  }
  galleryLightbox.classList.remove("is-open");
  galleryLightbox.setAttribute("aria-hidden", "true");
}

async function loadGallery() {
  if (!authToken || !authUser || authUser.is_guest) {
    setStatus("请先登录正式账号，再管理个人图库。");
    galleryItems = [];
    renderGallery();
    return;
  }

  setStatus("正在读取个人图库...");
  try {
    const data = await apiJson("/api/gallery");
    galleryItems = Array.isArray(data.items) ? data.items : [];
    activeGalleryItemId = galleryItems[0]?.id || null;
    setStatus(galleryItems.length > 0 ? `已加载 ${galleryItems.length} 张图片。` : "当前图库为空。");
  } catch (error) {
    galleryItems = [];
    activeGalleryItemId = null;
    setStatus(error.message || "读取图库失败。");
  }

  renderGallery();
}

async function uploadImage() {
  if (!authToken || !authUser || authUser.is_guest) {
    setStatus("请先登录正式账号，再上传图片。");
    return;
  }

  const file = galleryUploadInput?.files?.[0];
  if (!file) {
    setStatus("请先选择一张图片。");
    return;
  }

  setStatus("正在上传图片...");
  try {
    await apiUpload("/api/gallery/upload", "image", file, { caption: file.name });
    galleryUploadInput.value = "";
    await loadGallery();
  } catch (error) {
    setStatus(error.message || "上传失败。");
  }
}

async function deleteCurrentImage() {
  if (!authToken || !authUser || authUser.is_guest) {
    setStatus("请先登录正式账号，再删除图片。");
    return;
  }

  if (!activeGalleryItemId) {
    setStatus("请先选中一张图片。");
    return;
  }

  setStatus("正在删除图片...");
  try {
    await apiJson(`/api/gallery/items/${activeGalleryItemId}`, { method: "DELETE" });
    closeLightbox();
    await loadGallery();
  } catch (error) {
    setStatus(error.message || "删除失败。");
  }
}

function initializePage() {
  document.body.dataset.theme = getTheme();
  restoreAuth();
  renderGallery();
  loadGallery();

  galleryUploadButton?.addEventListener("click", () => galleryUploadInput?.click());
  galleryUploadInput?.addEventListener("change", uploadImage);
  galleryDeleteButton?.addEventListener("click", deleteCurrentImage);
  galleryReloadButton?.addEventListener("click", loadGallery);
  galleryLightboxClose?.addEventListener("click", closeLightbox);
  galleryLightbox?.addEventListener("click", (event) => {
    if (event.target === galleryLightbox || event.target.classList.contains("gallery-lightbox-backdrop")) {
      closeLightbox();
    }
  });
}

initializePage();
