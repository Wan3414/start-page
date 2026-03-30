const THEME_STORAGE_KEY = "wan-start-page-theme";
const APP_MODE_STORAGE_KEY = "wan-start-page-mode";
const API_BASE_STORAGE_KEY = "wan-start-page-api-base";
const AUTH_TOKEN_STORAGE_KEY = "wan-start-page-auth-token";
const AUTH_USER_STORAGE_KEY = "wan-start-page-auth-user";
const AUTH_GUEST_STORAGE_KEY = "wan-start-page-auth-guest";
const USER_SETTINGS_STORAGE_KEY = "wan-start-page-user-settings";

const body = document.body;
const settingsAvatarInitials = document.getElementById("settingsAvatarInitials");
const settingsAccountName = document.getElementById("settingsAccountName");
const settingsAccountMeta = document.getElementById("settingsAccountMeta");
const settingsPreferredNameInput = document.getElementById("settingsPreferredNameInput");
const settingsEmailInput = document.getElementById("settingsEmailInput");
const settingsSignatureInput = document.getElementById("settingsSignatureInput");
const settingsSaveButton = document.getElementById("settingsSaveButton");
const settingsResetButton = document.getElementById("settingsResetButton");
const settingsResultText = document.getElementById("settingsResultText");
const personalLogoutButton = document.getElementById("personalLogoutButton");
const modeSwitch = document.querySelector(".mode-switch");
const modeHighlight = modeSwitch?.querySelector(".segment-highlight");
const userModeButton = document.getElementById("userModeButton");
const developerModeButton = document.getElementById("developerModeButton");
const themeSwitch = document.querySelector(".theme-switch");
const themeHighlight = themeSwitch?.querySelector(".segment-highlight");
const themeDarkButton = document.getElementById("themeDarkButton");
const themeLightButton = document.getElementById("themeLightButton");

let currentAuthToken = "";
let currentAuthUser = null;
let currentUserSettings = {
  preferred_name: "",
  email: "",
  signature: "",
};
let themeSegmentControl;
let modeSegmentControl;

function getStoredAuthToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveAuthToken(value) {
  try {
    if (value) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {}
}

function getStoredAuthUser() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

function saveAuthUser(user) {
  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch (error) {}
}

function getStoredGuestMode() {
  try {
    return window.localStorage.getItem(AUTH_GUEST_STORAGE_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function saveGuestMode(enabled) {
  try {
    if (enabled) {
      window.localStorage.setItem(AUTH_GUEST_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(AUTH_GUEST_STORAGE_KEY);
    }
  } catch (error) {}
}

function getStoredUserSettings() {
  try {
    const rawValue = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { preferred_name: "", email: "", signature: "" };
    }
    const parsed = JSON.parse(rawValue);
    return {
      preferred_name: typeof parsed.preferred_name === "string" ? parsed.preferred_name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      signature: typeof parsed.signature === "string" ? parsed.signature : "",
    };
  } catch (error) {
    return { preferred_name: "", email: "", signature: "" };
  }
}

function saveUserSettings(settings) {
  try {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {}
}

function normalizeApiBase(value) {
  return value.trim().replace(/\/+$/, "");
}

function getDefaultApiBase() {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return `${protocol}//${hostname}:8000`;
  }
  return "";
}

function getApiBaseForRequest() {
  try {
    const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY) || "";
    return normalizeApiBase(stored) || getDefaultApiBase();
  } catch (error) {
    return getDefaultApiBase();
  }
}

function getAuthHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

async function apiJsonRequest(path, options = {}) {
  const apiBase = getApiBaseForRequest();
  if (!apiBase) {
    throw new Error("当前没有可用的后端地址。");
  }

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers: {
      ...getAuthHeaders(),
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
    throw new Error((data && (data.detail || data.message)) || `HTTP ${response.status}`);
  }

  return data;
}

function getAvatarLabelSource() {
  const preferredName = currentUserSettings.preferred_name.trim();
  if (preferredName) {
    return preferredName;
  }
  if (currentAuthUser?.is_guest) {
    return "游客";
  }
  if (currentAuthUser?.username) {
    return currentAuthUser.username;
  }
  return "访客";
}

function computeAvatarInitials(source) {
  const compact = source.replace(/\s+/g, "");
  if (!compact) {
    return "SP";
  }
  const ascii = compact.replace(/[^A-Za-z0-9]/g, "");
  if (ascii.length >= 2) {
    return ascii.slice(0, 2).toUpperCase();
  }
  return compact.slice(0, 2).toUpperCase();
}

function renderAccountSummary() {
  const labelSource = getAvatarLabelSource();
  settingsAvatarInitials.textContent = computeAvatarInitials(labelSource);
  settingsAccountName.textContent = labelSource;

  if (currentAuthUser?.is_guest) {
    settingsAccountMeta.textContent = "当前为游客模式，个人设置只保存在当前浏览器。";
  } else if (currentAuthUser?.username) {
    settingsAccountMeta.textContent = `登录账号：${currentAuthUser.username}`;
  } else {
    settingsAccountMeta.textContent = "尚未完成认证，当前设置只保存在本地。";
  }

  settingsPreferredNameInput.value = currentUserSettings.preferred_name;
  settingsEmailInput.value = currentUserSettings.email;
  settingsSignatureInput.value = currentUserSettings.signature;
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  body.dataset.theme = nextTheme;
  themeDarkButton.classList.toggle("is-active", nextTheme === "dark");
  themeLightButton.classList.toggle("is-active", nextTheme === "light");
  themeDarkButton.setAttribute("aria-pressed", String(nextTheme === "dark"));
  themeLightButton.setAttribute("aria-pressed", String(nextTheme === "light"));
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {}
  if (themeSegmentControl) {
    themeSegmentControl.snapTo(nextTheme === "dark" ? themeDarkButton : themeLightButton);
  }
}

function setAppMode(mode) {
  const nextMode = mode === "developer" ? "developer" : "user";
  userModeButton.classList.toggle("is-active", nextMode === "user");
  developerModeButton.classList.toggle("is-active", nextMode === "developer");
  userModeButton.setAttribute("aria-pressed", String(nextMode === "user"));
  developerModeButton.setAttribute("aria-pressed", String(nextMode === "developer"));
  try {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, nextMode);
  } catch (error) {}
  if (modeSegmentControl) {
    modeSegmentControl.snapTo(nextMode === "developer" ? developerModeButton : userModeButton);
  }
}

function initializeTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
  } catch (error) {}
  setTheme("dark");
}

function initializeAppMode() {
  try {
    const savedMode = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (savedMode === "developer" || savedMode === "user") {
      setAppMode(savedMode);
      return;
    }
  } catch (error) {}
  setAppMode("user");
}

function saveSettingsFromForm() {
  currentUserSettings = {
    preferred_name: settingsPreferredNameInput.value.trim(),
    email: settingsEmailInput.value.trim(),
    signature: settingsSignatureInput.value.trim(),
  };
  saveUserSettings(currentUserSettings);
  renderAccountSummary();
  settingsResultText.textContent = "本地个人设置已保存。";
}

function resetSettingsForm() {
  currentUserSettings = { preferred_name: "", email: "", signature: "" };
  saveUserSettings(currentUserSettings);
  renderAccountSummary();
  settingsResultText.textContent = "本地个人设置已重置。";
}

async function logoutCurrentIdentity() {
  if (currentAuthUser?.is_guest) {
    currentAuthUser = null;
    saveGuestMode(false);
    saveAuthToken("");
    saveAuthUser(null);
    renderAccountSummary();
    settingsResultText.textContent = "已退出游客模式。";
    return;
  }

  if (!currentAuthToken) {
    currentAuthUser = null;
    saveGuestMode(false);
    saveAuthUser(null);
    renderAccountSummary();
    settingsResultText.textContent = "当前没有登录会话。";
    return;
  }

  try {
    const data = await apiJsonRequest("/api/auth/logout", { method: "POST" });
    currentAuthToken = "";
    currentAuthUser = null;
    saveAuthToken("");
    saveGuestMode(false);
    saveAuthUser(null);
    renderAccountSummary();
    settingsResultText.textContent = data.message || "已退出登录。";
  } catch (error) {
    settingsResultText.textContent = error.message || "退出失败。";
  }
}

async function restoreAuthSession() {
  currentAuthToken = getStoredAuthToken();
  currentAuthUser = getStoredAuthUser();

  if (currentAuthUser?.is_guest || getStoredGuestMode()) {
    currentAuthToken = "";
    currentAuthUser = { username: "guest", is_guest: true };
    saveAuthToken("");
    saveAuthUser(currentAuthUser);
    saveGuestMode(true);
    renderAccountSummary();
    settingsResultText.textContent = "游客模式已恢复。";
    return;
  }

  if (!currentAuthToken) {
    renderAccountSummary();
    settingsResultText.textContent = "当前没有登录会话。";
    return;
  }

  try {
    const data = await apiJsonRequest("/api/auth/me");
    currentAuthUser = data.user || null;
    saveAuthUser(currentAuthUser);
    renderAccountSummary();
    settingsResultText.textContent = "已恢复登录会话。";
  } catch (error) {
    currentAuthToken = "";
    currentAuthUser = null;
    saveAuthToken("");
    saveGuestMode(false);
    saveAuthUser(null);
    renderAccountSummary();
    settingsResultText.textContent = "登录状态已失效，请回首页重新认证。";
  }
}

function positionSegmentHighlight(container, highlight, target, animate = true) {
  if (!container || !highlight || !target) {
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = targetRect.left - containerRect.left;
  highlight.style.transition = animate ? "" : "none";
  highlight.style.width = `${targetRect.width}px`;
  highlight.style.left = `${offset}px`;
  highlight.style.transform = "scaleX(1) scaleY(1)";
  if (!animate) {
    requestAnimationFrame(() => {
      highlight.style.transition = "";
    });
  }
}

function createSegmentControl(container, highlight, buttons, onSelect) {
  if (!container || !highlight || buttons.length === 0) {
    return null;
  }

  let currentTarget = buttons.find((button) => button.classList.contains("is-active")) ?? buttons[0];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      currentTarget = button;
      onSelect(button);
    });
  });

  return {
    snapTo(button, animate = true) {
      currentTarget = button;
      positionSegmentHighlight(container, highlight, button, animate);
    },
    refresh() {
      positionSegmentHighlight(container, highlight, currentTarget, false);
    },
  };
}

currentUserSettings = getStoredUserSettings();
renderAccountSummary();
initializeTheme();
initializeAppMode();

modeSegmentControl = createSegmentControl(
  modeSwitch,
  modeHighlight,
  [userModeButton, developerModeButton],
  (button) => setAppMode(button === developerModeButton ? "developer" : "user")
);

themeSegmentControl = createSegmentControl(
  themeSwitch,
  themeHighlight,
  [themeDarkButton, themeLightButton],
  (button) => setTheme(button === themeLightButton ? "light" : "dark")
);

modeSegmentControl?.refresh();
themeSegmentControl?.refresh();

settingsSaveButton.addEventListener("click", saveSettingsFromForm);
settingsResetButton.addEventListener("click", resetSettingsForm);
personalLogoutButton.addEventListener("click", logoutCurrentIdentity);
restoreAuthSession();
