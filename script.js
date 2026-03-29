const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  baidu: "https://www.baidu.com/s?wd=",
};

const QUICK_LINKS = [
  {
    title: "GitHub",
    description: "仓库、变更与协作入口。",
    href: "https://github.com/",
    domain: "Code",
    icon: "github",
  },
  {
    title: "ChatGPT",
    description: "写作、整理与代码辅助。",
    href: "https://chatgpt.com/",
    domain: "Assist",
    icon: "spark",
  },
  {
    title: "Gemini",
    description: "补充检索与多模型参考。",
    href: "https://gemini.google.com/",
    domain: "Search",
    icon: "gemini",
  },
  {
    title: "Gmail",
    description: "集中处理待回复邮件。",
    href: "https://mail.google.com/",
    domain: "Inbox",
    icon: "mail",
  },
  {
    title: "Calendar",
    description: "查看今天的时间块。",
    href: "https://calendar.google.com/",
    domain: "Plan",
    icon: "calendar",
  },
  {
    title: "YouTube",
    description: "教程、收藏与轻量放松。",
    href: "https://www.youtube.com/",
    domain: "Media",
    icon: "play",
  },
];

const FALLBACK_QUOTES = [
  { text: "先做关键事，再看噪音。", source: "默认提醒" },
  { text: "开始比完美更重要。", source: "默认提醒" },
  { text: "把复杂问题拆成今天能动的一步。", source: "默认提醒" },
];

const GALLERY_IMAGES = [
  {
    src: "./assets/gallery/hero-reference.jpg",
    alt: "Gallery preview one",
    caption: "完整显示原图，先看比例、留白和整体气质。",
  },
  {
    src: "./assets/gallery/fee6b42c07076c5227b9963004734fbe.jpg",
    alt: "Gallery preview two",
    caption: "切换另一张图，观察不同照片在卡片系统里的稳定性。",
  },
];

const body = document.body;
const greetingTitle = document.getElementById("greetingTitle");
const focusTitle = document.getElementById("focusTitle");
const focusMeta = document.getElementById("focusMeta");
const clockText = document.getElementById("clockText");
const dateText = document.getElementById("dateText");
const quoteCard = document.getElementById("quoteCard");
const quoteText = document.getElementById("quoteText");
const quoteSource = document.getElementById("quoteSource");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const quickLinksGrid = document.getElementById("quickLinksGrid");
const enginePills = document.querySelectorAll(".engine-pill");
const galleryFrame = document.getElementById("galleryFrame");
const galleryImage = document.getElementById("galleryImage");
const galleryCaption = document.getElementById("galleryCaption");

let activeEngine = "google";
let quotePool = FALLBACK_QUOTES;
let currentImageIndex = 0;

const LINK_ICONS = {
  github: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18c-4 1.5-4-2-6-2" />
      <path d="M15 22v-3.5c0-1 .3-1.8.9-2.4C12.7 15.7 9 14.5 9 9.5a5 5 0 0 1 1.3-3.4A4.6 4.6 0 0 1 10.4 3S11.6 2.6 14 4.2A8.2 8.2 0 0 1 20 6a5 5 0 0 1 1.3 3.5c0 5-3.7 6.2-6.9 6.6.6.6.9 1.4.9 2.4V22" />
    </svg>
  `,
  spark: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </svg>
  `,
  gemini: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3c.8 4.2 4.1 7.5 8.3 8.3C16.1 12.1 12.8 15.4 12 19.6c-.8-4.2-4.1-7.5-8.3-8.3C7.9 10.5 11.2 7.2 12 3z" />
    </svg>
  `,
  mail: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </svg>
  `,
  calendar: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  `,
  play: `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="4" />
      <path d="M11 10l4 2-4 2v-4z" />
    </svg>
  `,
};

function updateClock() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  clockText.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  dateText.textContent = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Time-sensitive copy keeps the page feeling like a living system widget.
  if (hour < 11) {
    greetingTitle.textContent = "早上好，准备进入今天的重点。";
    focusTitle.textContent = "上午适合先处理最需要清醒度的任务。";
    focusMeta.textContent = "把最难的一项放在前面，其他事情往后退。";
  } else if (hour < 18) {
    greetingTitle.textContent = "下午好，保持节奏，不要切得太碎。";
    focusTitle.textContent = "把注意力留给真正需要收口的事情。";
    focusMeta.textContent = "减少切换，把执行阶段留得更完整。";
  } else {
    greetingTitle.textContent = "晚上好，适合整理、复盘和温和收束。";
    focusTitle.textContent = "给总结和回收留一点空间。";
    focusMeta.textContent = "把今天沉淀下来，明天会更顺。";
  }
}

function renderQuickLinks() {
  const cards = QUICK_LINKS.map(
    (item) => `
      <a class="link-card glass-card" href="${item.href}" target="_blank" rel="noreferrer">
        <div class="link-top">
          <span class="link-icon">${LINK_ICONS[item.icon] ?? ""}</span>
          <span class="link-domain">${item.domain}</span>
        </div>
        <h3 class="link-title">${item.title}</h3>
        <p class="link-description">${item.description}</p>
      </a>
    `
  ).join("");

  quickLinksGrid.innerHTML = cards;
}

function pickRandomQuote() {
  return quotePool[Math.floor(Math.random() * quotePool.length)];
}

function renderQuote() {
  const item = pickRandomQuote();
  quoteText.textContent = item.text;
  quoteSource.textContent = item.source;
}

async function loadQuotes() {
  try {
    const response = await fetch("./quotes.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load quotes");
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      quotePool = data;
    }
  } catch (error) {
    quotePool = FALLBACK_QUOTES;
  }

  renderQuote();
}

function renderGalleryImage() {
  const item = GALLERY_IMAGES[currentImageIndex];
  galleryImage.src = item.src;
  galleryImage.alt = item.alt;
  galleryCaption.textContent = item.caption;
}

function showNextImage() {
  currentImageIndex = (currentImageIndex + 1) % GALLERY_IMAGES.length;
  renderGalleryImage();
}

function handleInteractiveKeydown(event, action) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function setActiveEngine(engine) {
  activeEngine = engine;
  enginePills.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.engine === engine);
  });
}

function handleSearch(event) {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }

  const url = `${SEARCH_ENGINES[activeEngine]}${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

renderQuickLinks();
renderGalleryImage();
updateClock();
loadQuotes();
setInterval(updateClock, 1000);

enginePills.forEach((button) => {
  button.addEventListener("click", () => setActiveEngine(button.dataset.engine));
});

searchForm.addEventListener("submit", handleSearch);
quoteCard.addEventListener("click", renderQuote);
quoteCard.addEventListener("keydown", (event) => handleInteractiveKeydown(event, renderQuote));
galleryFrame.addEventListener("click", showNextImage);
galleryFrame.addEventListener("keydown", (event) => handleInteractiveKeydown(event, showNextImage));

window.addEventListener("load", () => {
  body.classList.add("is-ready");
});
