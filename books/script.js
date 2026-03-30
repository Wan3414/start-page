const THEME_STORAGE_KEY = "wan-start-page-theme";
const API_BASE_STORAGE_KEY = "wan-start-page-api-base";
const AUTH_TOKEN_STORAGE_KEY = "wan-start-page-auth-token";
const AUTH_USER_STORAGE_KEY = "wan-start-page-auth-user";

const booksHeaderEyebrow = document.getElementById("booksHeaderEyebrow");
const booksHeaderTitle = document.getElementById("booksHeaderTitle");
const booksHeaderCopy = document.getElementById("booksHeaderCopy");
const booksBackHomeLink = document.getElementById("booksBackHomeLink");
const booksLibraryEyebrow = document.getElementById("booksLibraryEyebrow");
const booksLibraryTitle = document.getElementById("booksLibraryTitle");
const booksUploadInput = document.getElementById("booksUploadInput");
const booksUploadButton = document.getElementById("booksUploadButton");
const booksUploadResult = document.getElementById("booksUploadResult");
const booksPreviewEyebrow = document.getElementById("booksPreviewEyebrow");
const booksList = document.getElementById("booksList");
const booksTitle = document.getElementById("booksTitle");
const booksSummary = document.getElementById("booksSummary");
const booksMeta = document.getElementById("booksMeta");
const booksContent = document.getElementById("booksContent");
const booksReaderLink = document.getElementById("booksReaderLink");
const bookPreviewModal = document.getElementById("bookPreviewModal");
const bookPreviewBackdrop = document.getElementById("bookPreviewBackdrop");
const bookPreviewClose = document.getElementById("bookPreviewClose");

const readerInfoEyebrow = document.getElementById("readerInfoEyebrow");
const readerBookTitle = document.getElementById("readerBookTitle");
const readerBookSummary = document.getElementById("readerBookSummary");
const readerBookMeta = document.getElementById("readerBookMeta");
const readerBookBody = document.getElementById("readerBookBody");
const readerBackLibraryLink = document.getElementById("readerBackLibraryLink");
const readerBackHomeLink = document.getElementById("readerBackHomeLink");
const readerViewport = document.getElementById("readerViewport");
const readerStatus = document.getElementById("readerStatus");
const readerShell = document.getElementById("readerShell");
const readerPrevHotspot = document.getElementById("readerPrevHotspot");
const readerNextHotspot = document.getElementById("readerNextHotspot");
const readerBookmarkHint = document.getElementById("readerBookmarkHint");
const readerAddBookmarkButton = document.getElementById("readerAddBookmarkButton");
const readerRemoveBookmarkButton = document.getElementById("readerRemoveBookmarkButton");
const readerUndoButton = document.getElementById("readerUndoButton");
const readerBookmarksEyebrow = document.getElementById("readerBookmarksEyebrow");
const readerBookmarksTitle = document.getElementById("readerBookmarksTitle");
const readerBookmarksList = document.getElementById("readerBookmarksList");

let books = [];
let activeBookId = "";
let currentBookRendition = null;
let currentEpubBook = null;
let currentReaderBookId = "";
let currentLocationCfi = "";
let currentLocationProgress = "";
let currentAuthToken = "";
let currentAuthUser = null;
let readerUndoStack = [];
let persistProgressTimer = 0;

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch (error) {
    return "dark";
  }
}

function applyPageTheme() {
  document.body.dataset.theme = getStoredTheme();
}

function getApiBase() {
  try {
    const stored = (localStorage.getItem(API_BASE_STORAGE_KEY) || "").trim().replace(/\/+$/, "");
    if (stored) {
      return stored;
    }
  } catch (error) {}

  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return `${protocol}//${hostname}:8000`;
  }
  return "";
}

function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function getAuthHeaders(includeJson) {
  const headers = {
    Accept: "application/json",
  };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

async function apiJson(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("当前没有可用的后端地址。");
  }

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers: {
      ...getAuthHeaders(options.json !== false),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (error) {
    data = { raw };
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || `HTTP ${response.status}`);
  }

  return data;
}

async function apiUpload(path, fieldName, file) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("当前没有可用的后端地址。");
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  const headers = {};
  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (error) {
    data = { raw };
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || `HTTP ${response.status}`);
  }

  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildBookMeta(book) {
  const chips = [];
  if (book.author) chips.push(`作者：${book.author}`);
  if (book.size_bytes) chips.push(`大小：${Math.max(1, Math.round(book.size_bytes / 1024))} KB`);
  if (book.created_at) chips.push(`入库：${book.created_at}`);
  return chips;
}

function renderBookMeta(target, book) {
  if (!target) {
    return;
  }
  target.innerHTML = buildBookMeta(book)
    .map((item) => `<span class="book-meta-chip">${escapeHtml(item)}</span>`)
    .join("");
}

function getBookById(bookId) {
  return books.find((book) => String(book.id) === String(bookId)) || null;
}

function renderBooksList() {
  if (!booksList) {
    return;
  }

  if (!currentAuthToken || !currentAuthUser || currentAuthUser.is_guest) {
    booksList.innerHTML = '<p class="books-copy">当前没有登录账号，书库上传和书签保存只在登录后可用。</p>';
    return;
  }

  if (books.length === 0) {
    booksList.innerHTML = '<p class="books-copy">当前用户书库为空，先上传一本 EPUB。</p>';
    return;
  }

  booksList.innerHTML = books.map((book) => `
    <button class="book-item" type="button" data-book-id="${escapeHtml(book.id)}">
      <div class="book-item-top">
        <div>
          <strong class="book-item-title">${escapeHtml(book.title)}</strong>
          <p class="book-item-author">${escapeHtml(book.author || "未知作者")}</p>
        </div>
        <span class="book-item-status">用户书库</span>
      </div>
      <p class="book-item-summary">${escapeHtml(book.summary || "用户上传的 EPUB 电子书。")}</p>
    </button>
  `).join("");

  booksList.querySelectorAll(".book-item").forEach((button) => {
    button.addEventListener("click", () => {
      const book = getBookById(button.dataset.bookId);
      if (book) {
        openBookPreview(book);
      }
    });
  });
}

function renderBookPreview(book) {
  if (!book || !booksTitle || !booksSummary || !booksContent || !booksReaderLink) {
    return;
  }

  activeBookId = String(book.id);
  booksTitle.textContent = book.title;
  booksSummary.textContent = book.summary || "用户上传的 EPUB 电子书。";
  renderBookMeta(booksMeta, book);
  booksContent.innerHTML = `
    <p>${escapeHtml(book.original_name || "")}</p>
    <p>${escapeHtml((book.metadata && book.metadata.title) || "后端已完成元信息解析，可继续扩章节和正文预处理。")}</p>
  `;
  booksReaderLink.href = `./reader.html?book=${encodeURIComponent(book.id)}`;
}

function openBookPreview(book) {
  if (!bookPreviewModal) {
    return;
  }
  renderBookPreview(book);
  bookPreviewModal.classList.add("is-open");
  bookPreviewModal.setAttribute("aria-hidden", "false");
}

function closeBookPreview() {
  if (!bookPreviewModal) {
    return;
  }
  bookPreviewModal.classList.remove("is-open");
  bookPreviewModal.setAttribute("aria-hidden", "true");
}

async function loadBooks() {
  if (!currentAuthToken || !currentAuthUser || currentAuthUser.is_guest) {
    books = [];
    renderBooksList();
    return;
  }

  try {
    const data = await apiJson("/api/books", { json: false });
    books = Array.isArray(data.books) ? data.books : [];
  } catch (error) {
    books = [];
    if (booksUploadResult) {
      booksUploadResult.textContent = error.message || "加载书库失败。";
    }
  }

  renderBooksList();
}

async function uploadBook() {
  if (!currentAuthToken || !currentAuthUser || currentAuthUser.is_guest) {
    if (booksUploadResult) {
      booksUploadResult.textContent = "请先用正式账号登录，再上传 EPUB。";
    }
    return;
  }

  const file = booksUploadInput?.files?.[0];
  if (!file) {
    if (booksUploadResult) {
      booksUploadResult.textContent = "请先选择一个 .epub 文件。";
    }
    return;
  }

  if (booksUploadResult) {
    booksUploadResult.textContent = "正在上传并解析 EPUB...";
  }

  try {
    const data = await apiUpload("/api/books/upload", "book_file", file);
    if (booksUploadResult) {
      booksUploadResult.textContent = data.book ? `已上传：${data.book.title}` : "上传完成。";
    }
    booksUploadInput.value = "";
    await loadBooks();
  } catch (error) {
    if (booksUploadResult) {
      booksUploadResult.textContent = error.message || "上传失败。";
    }
  }
}

function getReaderThemeStyles() {
  const theme = document.body.dataset.theme === "light" ? "light" : "dark";
  if (theme === "light") {
    return {
      body: {
        "font-family": "\"Georgia\", \"PingFang SC\", \"Noto Serif SC\", serif",
        "font-size": "18px",
        "line-height": "1.9",
        color: "#1d2430",
        background: "#fbfaf7",
        margin: "0",
        padding: "28px 32px",
      },
      p: { margin: "0 0 1.2em" },
      img: { "max-width": "100%", height: "auto" },
    };
  }
  return {
    body: {
      "font-family": "\"Georgia\", \"PingFang SC\", \"Noto Serif SC\", serif",
      "font-size": "18px",
      "line-height": "1.9",
      color: "#f4f6fb",
      background: "#0f131a",
      margin: "0",
      padding: "28px 32px",
    },
    p: { margin: "0 0 1.2em" },
    img: { "max-width": "100%", height: "auto" },
  };
}

function pushUndoLocation(cfi) {
  if (!cfi || readerUndoStack[readerUndoStack.length - 1] === cfi) {
    return;
  }
  readerUndoStack.push(cfi);
  if (readerUndoStack.length > 20) {
    readerUndoStack.shift();
  }
}

async function loadBookmarks(bookId) {
  if (!readerBookmarksList || !currentAuthToken) {
    return;
  }

  try {
    const data = await apiJson(`/api/books/${bookId}/bookmarks`, { json: false });
    const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
    if (bookmarks.length === 0) {
      readerBookmarksList.innerHTML = '<p class="reader-bookmark-meta">当前还没有保存的书签。</p>';
      return;
    }
    readerBookmarksList.innerHTML = bookmarks.map((bookmark, index) => `
      <button class="reader-bookmark-item" type="button" data-bookmark-cfi="${escapeHtml(bookmark.cfi)}">
        <span class="reader-bookmark-label">${escapeHtml(bookmark.label || `书签 ${index + 1}`)}</span>
        <span class="reader-bookmark-meta">${escapeHtml(bookmark.progress || "")}</span>
      </button>
    `).join("");
    readerBookmarksList.querySelectorAll(".reader-bookmark-item").forEach((button) => {
      button.addEventListener("click", () => {
        const cfi = button.dataset.bookmarkCfi;
        if (cfi && currentBookRendition) {
          pushUndoLocation(currentLocationCfi);
          currentBookRendition.display(cfi);
        }
      });
    });
  } catch (error) {
    readerBookmarksList.innerHTML = `<p class="reader-bookmark-meta">${escapeHtml(error.message || "加载书签失败。")}</p>`;
  }
}

function persistProgressSoon(bookId) {
  if (!currentAuthToken || !currentLocationCfi) {
    return;
  }
  window.clearTimeout(persistProgressTimer);
  persistProgressTimer = window.setTimeout(async () => {
    try {
      await apiJson(`/api/books/${bookId}/progress`, {
        method: "POST",
        body: {
          cfi: currentLocationCfi,
          progress: currentLocationProgress,
        },
      });
    } catch (error) {
      if (readerStatus) {
        readerStatus.textContent = error.message || "保存阅读进度失败。";
      }
    }
  }, 260);
}

async function addCurrentBookmark() {
  if (!currentAuthToken || !currentReaderBookId || !currentLocationCfi) {
    return;
  }
  try {
    await apiJson(`/api/books/${currentReaderBookId}/bookmarks`, {
      method: "POST",
      body: {
        cfi: currentLocationCfi,
        progress: currentLocationProgress,
        label: currentLocationProgress ? `书签 · ${currentLocationProgress}` : "书签",
      },
    });
    if (readerStatus) {
      readerStatus.textContent = "已保存当前书签。";
    }
    await loadBookmarks(currentReaderBookId);
  } catch (error) {
    if (readerStatus) {
      readerStatus.textContent = error.message || "保存书签失败。";
    }
  }
}

async function removeCurrentBookmark() {
  if (!currentAuthToken || !currentReaderBookId || !currentLocationCfi) {
    return;
  }
  try {
    const response = await fetch(`${getApiBase()}/api/books/${currentReaderBookId}/bookmarks?cfi=${encodeURIComponent(currentLocationCfi)}`, {
      method: "DELETE",
      headers: getAuthHeaders(false),
    });
    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || `HTTP ${response.status}`);
    }
    if (readerStatus) {
      readerStatus.textContent = "已删除当前书签。";
    }
    await loadBookmarks(currentReaderBookId);
  } catch (error) {
    if (readerStatus) {
      readerStatus.textContent = error.message || "删除书签失败。";
    }
  }
}

function undoLastLocation() {
  const previous = readerUndoStack.pop();
  if (!previous || !currentBookRendition) {
    if (readerStatus) {
      readerStatus.textContent = "当前还没有可返回的位置。";
    }
    return;
  }
  currentBookRendition.display(previous);
  if (readerStatus) {
    readerStatus.textContent = "已返回上一步位置。";
  }
}

async function renderReaderPage() {
  if (!readerViewport) {
    return;
  }

  currentAuthToken = getAuthToken();
  currentAuthUser = getAuthUser();
  const query = new URLSearchParams(window.location.search);
  const bookId = query.get("book") || "";

  if (!currentAuthToken || !bookId) {
    if (readerStatus) {
      readerStatus.textContent = "缺少登录态或书籍编号。";
    }
    return;
  }

  try {
    const data = await apiJson("/api/books", { json: false });
    books = Array.isArray(data.books) ? data.books : [];
  } catch (error) {
    if (readerStatus) {
      readerStatus.textContent = error.message || "读取书库失败。";
    }
    return;
  }

  const book = getBookById(bookId);
  if (!book) {
    if (readerStatus) {
      readerStatus.textContent = "没有找到对应书籍。";
    }
    return;
  }

  currentReaderBookId = String(book.id);
  readerUndoStack = [];
  readerBookTitle && (readerBookTitle.textContent = book.title);
  readerBookSummary && (readerBookSummary.textContent = book.summary || "用户上传的 EPUB 电子书。");
  renderBookMeta(readerBookMeta, book);

  let savedCfi = "";
  try {
    const progressData = await apiJson(`/api/books/${book.id}/progress`, { json: false });
    savedCfi = progressData.progress?.cfi || "";
  } catch (error) {}

  await loadBookmarks(book.id);

  if (readerStatus) {
    readerStatus.textContent = "正在载入书籍…";
  }

  const response = await fetch(`${getApiBase()}/api/books/${book.id}/file`, {
    method: "GET",
    headers: getAuthHeaders(false),
  });
  if (!response.ok) {
    if (readerStatus) {
      readerStatus.textContent = `载入书籍失败：HTTP ${response.status}`;
    }
    return;
  }

  const buffer = await response.arrayBuffer();
  currentBookRendition?.destroy?.();
  currentBookRendition = null;
  currentEpubBook?.destroy?.();
  currentEpubBook = null;
  readerViewport.innerHTML = "";

  const bookInstance = window.ePub(buffer);
  currentEpubBook = bookInstance;
  currentBookRendition = bookInstance.renderTo("readerViewport", {
    width: "100%",
    height: `${readerViewport.clientHeight || 720}px`,
    flow: "paginated",
    spread: "auto",
    allowScriptedContent: false,
  });
  currentBookRendition.themes.default(getReaderThemeStyles());
  currentBookRendition.on("relocated", (location) => {
    const cfi = location && location.start && location.start.cfi ? location.start.cfi : "";
    if (cfi) {
      currentLocationCfi = cfi;
      if (currentEpubBook && currentEpubBook.locations) {
        const percentage = currentEpubBook.locations.percentageFromCfi(cfi);
        currentLocationProgress = Number.isFinite(percentage) ? `${Math.round(percentage * 100)}%` : "";
      }
      persistProgressSoon(book.id);
    }
  });

  await bookInstance.opened;
  await currentBookRendition.display(savedCfi || undefined);
  if (readerStatus) {
    readerStatus.textContent = "已进入在线阅读。";
  }
}

function initializeBooksPage() {
  currentAuthToken = getAuthToken();
  currentAuthUser = getAuthUser();
  booksHeaderEyebrow && (booksHeaderEyebrow.textContent = "BOOKS");
  booksHeaderTitle && (booksHeaderTitle.textContent = "书库");
  booksHeaderCopy && (booksHeaderCopy.textContent = "这里展示当前登录用户的 EPUB 书库，可以直接上传并进入阅读。");
  booksBackHomeLink && (booksBackHomeLink.textContent = "返回主页");
  booksLibraryEyebrow && (booksLibraryEyebrow.textContent = "LIBRARY");
  booksLibraryTitle && (booksLibraryTitle.textContent = "全部书目");
  booksPreviewEyebrow && (booksPreviewEyebrow.textContent = "PREVIEW");

  booksUploadButton?.addEventListener("click", () => {
    booksUploadInput?.click();
  });
  booksUploadInput?.addEventListener("change", uploadBook);
  bookPreviewClose?.addEventListener("click", closeBookPreview);
  bookPreviewBackdrop?.addEventListener("click", closeBookPreview);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBookPreview();
    }
  });

  loadBooks();
}

function initializeReaderPage() {
  readerInfoEyebrow && (readerInfoEyebrow.textContent = "BOOK INFO");
  readerBackLibraryLink && (readerBackLibraryLink.textContent = "返回书库");
  readerBackHomeLink && (readerBackHomeLink.textContent = "返回主页");
  readerBookmarkHint && (readerBookmarkHint.textContent = "书签现在按用户保存到后端，点书签可直接跳转。");
  readerBookmarksEyebrow && (readerBookmarksEyebrow.textContent = "BOOKMARKS");
  readerBookmarksTitle && (readerBookmarksTitle.textContent = "已保存书签");

  readerPrevHotspot?.addEventListener("click", () => {
    if (currentBookRendition) {
      pushUndoLocation(currentLocationCfi);
      currentBookRendition.prev();
    }
  });
  readerNextHotspot?.addEventListener("click", () => {
    if (currentBookRendition) {
      pushUndoLocation(currentLocationCfi);
      currentBookRendition.next();
    }
  });
  readerAddBookmarkButton?.addEventListener("click", addCurrentBookmark);
  readerRemoveBookmarkButton?.addEventListener("click", removeCurrentBookmark);
  readerUndoButton?.addEventListener("click", undoLastLocation);

  window.addEventListener("keydown", (event) => {
    if (!currentBookRendition) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      pushUndoLocation(currentLocationCfi);
      currentBookRendition.prev();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      pushUndoLocation(currentLocationCfi);
      currentBookRendition.next();
    }
  });

  renderReaderPage();
}

applyPageTheme();

if (booksList) {
  initializeBooksPage();
}

if (readerViewport) {
  initializeReaderPage();
}
