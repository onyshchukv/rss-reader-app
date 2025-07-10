import React, { useState, useEffect } from "react";
// Firebase imports Авторизация с помощью Firebase
import { auth, googleProvider } from "./firebase";


type Feed = {
  url: string;
  items: any[];
  title?: string;
  icon?: string;
};

// Количество отображаемых новостей
const [visibleCount, setVisibleCount] = useState(10);

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    const saved = localStorage.getItem("rssFeeds");
    return saved ? JSON.parse(saved) : [];
  });
  const [feedType, setFeedType] = useState<"RSS" | "Telegram" | "YouTube">("RSS");
  const [input, setInput] = useState("");
  const [selectedFeedIdx, setSelectedFeedIdx] = useState<number | null>(() => {
    const saved = localStorage.getItem("rssSelectedFeedIdx");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Функция для обработки клика по картинке
  const handleImageClick = (src: string) => {
    setModalImage(src);
  };
  // Модификация вывода новостей: обработка кликов по img
function renderContentWithImages(content: string) {
  return (
    <div
      style={{ fontSize: 15, maxWidth: 600, overflow: "hidden" }}
      dangerouslySetInnerHTML={{
        __html: `
          <div style="max-width:100%;overflow:hidden;">
            ${String(content || "")
              .replace(
                /<img([^>]+)src=['"]([^'"]+)['"]([^>]*)>/gi,
                `<img$1src="$2"$3 style="max-width:100%;height:auto;display:block;margin:8px 0;cursor:pointer;" data-img="$2" />`
              )}
          </div>
        `,
      }}
      onClick={e => {
        const target = e.target as HTMLElement;
        if (target.tagName === "IMG" && target.dataset.img) {
          e.preventDefault();
          e.stopPropagation();
          handleImageClick(target.dataset.img);
        }
      }}
    />
  );
}

async function getChannelIdFromHandle(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/@${handle}`);
    const text = await res.text();
    const match = text.match(/"channelId":"(UC[\w-]{22})"/);
    if (match) {
      return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}

// Добавьте состояние для прочитанных постов
const [readPosts, setReadPosts] = useState<{ [feedUrl: string]: Set<string> }>(() => {
  const saved = localStorage.getItem("rssReadPosts");
  if (saved) {
    const parsed = JSON.parse(saved);
    // Преобразуем массивы в Set
    Object.keys(parsed).forEach(url => {
      parsed[url] = new Set(parsed[url]);
    });
    return parsed;
  }
  return {};
});

// Сбросьте количество видимых постов при смене фида
useEffect(() => {
  setVisibleCount(10);
}, [selectedFeedIdx]);


// Сохраняйте прочитанные посты в localStorage
useEffect(() => {
  // Преобразуем Set обратно в массив для хранения
  const toSave: { [feedUrl: string]: string[] } = {};
  Object.keys(readPosts).forEach(url => {
    toSave[url] = Array.from(readPosts[url]);
  });
  localStorage.setItem("rssReadPosts", JSON.stringify(toSave));
}, [readPosts]);

// Отмечайте все посты как прочитанные при выборе фида
useEffect(() => {
  if (selectedFeedIdx === null || !feeds[selectedFeedIdx]) return;
  const feed = feeds[selectedFeedIdx];
  const ids = new Set(feed.items.map((item: any) => item.guid || item.link));
  setReadPosts(prev => ({
    ...prev,
    [feed.url]: ids,
  }));
}, [selectedFeedIdx]);

// Функция для получения количества непрочитанных постов
function getUnreadCount(feed: Feed): number {
  const read = readPosts[feed.url] || new Set();
  return feed.items.filter(item => !(read.has(item.guid || item.link))).length;
}

  // Сохраняем фиды и выбранный индекс при изменении
  useEffect(() => {
    localStorage.setItem("rssFeeds", JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    localStorage.setItem("rssSelectedFeedIdx", JSON.stringify(selectedFeedIdx));
  }, [selectedFeedIdx]);

const handleAddFeed = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input) return;
  let url = input.trim();
  let icon = "";

  if (feedType === "Telegram") {
  // Извлекаем username из ссылки
  const match = url.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]+)/);
  const username = match ? match[1] : null;
  if (!username) {
    alert("Введите корректную ссылку на Telegram-канал");
    return;
  }
  // Используем RSSHub для получения RSS Telegram-канала
  url = `https://rsshub.app/telegram/channel/${username}`;
  // Новый способ получения аватара Telegram
  icon = `https://t.me/i/userpic/320/${username}.jpg`;
} else {
    if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    // Для RSS favicon сайта
    try {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}`;
    } catch {
      icon = "";
    }
  }

  if (feedType === "YouTube") {
    let channelId = "";
    let match = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (match) {
      channelId = match[1];
    } else {
      alert(
        "Для YouTube поддерживаются только ссылки вида https://www.youtube.com/channel/CHANNEL_ID. Получить channelId можно здесь: https://commentpicker.com/youtube-channel-id.php"
      );
      return;
    }
    url = `https://rsshub.app/youtube/channel/${channelId}`;
    icon = `https://yt3.googleusercontent.com/ytc/${channelId}=s88-c-k-c0x00ffffff-no-rj`;
  }


  setLoading(true);
  try {
    const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const newFeed: Feed = {
      url,
      items: data.items || [],
      title: data.feed?.title || url,
      icon,
    };
    setFeeds((prev) => [...prev, newFeed]);
    setSelectedFeedIdx(feeds.length);
    setInput("");
  } catch {
    alert("Ошибка загрузки RSS");
  }
  setLoading(false);
};


  const handleSelectFeed = (idx: number) => {
    setSelectedFeedIdx(idx);
  };

  const handleDeleteFeed = (idx: number) => {
    setFeeds(prev => {
      const newFeeds = prev.filter((_, i) => i !== idx);
      // Корректно обновляем выбранный индекс
      if (selectedFeedIdx === idx) {
        setSelectedFeedIdx(null);
      } else if (selectedFeedIdx !== null && selectedFeedIdx > idx) {
        setSelectedFeedIdx(selectedFeedIdx - 1);
      }
      return newFeeds;
    });
  };

  const selectedFeed = selectedFeedIdx !== null ? feeds[selectedFeedIdx] : null;

// ...внутри компонента App...

// Функция для обновления всех фидов
const updateAllFeeds = async () => {
  setFeeds(prevFeeds => {
    // Сохраняем старые фиды, чтобы не терять title, если запрос не удался
    return prevFeeds.map(feed => ({ ...feed }));
  });
  for (let i = 0; i < feeds.length; i++) {
    try {
      const res = await fetch(`/api/rss?url=${encodeURIComponent(feeds[i].url)}`);
      const data = await res.json();
      setFeeds(prevFeeds => {
        const updated = [...prevFeeds];
        updated[i] = {
          ...updated[i],
          items: data.items || [],
          title: data.feed?.title || updated[i].url,
        };
        return updated;
      });
    } catch {
      // Игнорируем ошибки обновления отдельного фида
    }
  }
};

// Периодическое обновление фидов
useEffect(() => {
  if (feeds.length === 0) return;
  const interval = setInterval(() => {
    updateAllFeeds();
  }, 60000); // 60 секунд
  return () => clearInterval(interval);
  // eslint-disable-next-line
}, [feeds.length]);



 return (
  <div style={{ minHeight: "100vh", background: "#f7f7f7" }}>
    {/* Top Bar */}
    <div
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    background: "#fff",
    borderBottom: "1px solid #eee",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    padding: "0 32px",
    boxSizing: "border-box",
  }}
>
  <h2 style={{ margin: 0, marginRight: 32, fontWeight: 700, fontSize: 28 }}>RSS Reader</h2>
  <form
    onSubmit={handleAddFeed}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      flex: 1,
    
    }}
  ></form>
      <form
        onSubmit={handleAddFeed}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          maxWidth: 600,
        }}
      >
        <select
          value={feedType}
          onChange={e => setFeedType(e.target.value as "RSS" | "Telegram" | "YouTube")}
          style={{ padding: 8, fontSize: 16 }}
        >
          <option value="RSS">RSS</option>
          <option value="Telegram">Telegram</option>
          <option value="YouTube">YouTube</option>
        </select>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            feedType === "RSS"
              ? "Введите ссылку на RSS feed"
              : feedType === "Telegram"
              ? "Введите ссылку на Telegram-канал"
              : "Введите ссылку на YouTube-канал (только /channel/CHANNEL_ID)"
          }
          style={{ width: "60%", padding: 8 }}
        />
        <button type="submit" style={{ padding: 8 }}>Добавить</button>
      </form>
    </div>
    {/* Сайдбар */}
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 80,
        bottom: 0,
        width: 260,
        background: "#fff",
        borderRight: "1px solid #eee",
        padding: "32px 16px 16px 32px",
        boxSizing: "border-box",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Ваши фиды:</h2>
      <button
    onClick={updateAllFeeds}
    style={{
      marginRight: 24,
      padding: "8px 18px",
      borderRadius: 8,
      border: "1px solid #1976d2",
      background: "#fff",
      color: "#1976d2",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: 16
    }}
    disabled={loading}
    title="Обновить все ленты"
  >
    {loading ? "Обновление..." : "Обновить все"}
  </button>
      <ul style={{ padding: 0, margin: 0, listStyle: "none", flex: 1, overflowY: "auto" }}>
        {feeds.map((feed, idx) => (
          <li
            key={feed.url}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: "6px 0",
              color: selectedFeedIdx === idx ? "#1976d2" : "#222",
              fontWeight: selectedFeedIdx === idx ? "bold" : "normal",
              textDecoration: selectedFeedIdx === idx ? "underline" : "none"
            }}
            title={feed.url}
          >
            <span
              onClick={() => handleSelectFeed(idx)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0, // важно для flex+ellipsis
              }}
            >
              {feed.icon && (
                <img
                  src={feed.icon}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              <span
                style={{
                  maxWidth: 120,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "inline-block",
                }}
              >
                {feed.title}
              </span>
            </span>
            {getUnreadCount(feed) > 0 && (
              <span style={{
                background: "#1976d2",
                color: "#fff",
                borderRadius: 8,
                padding: "0 6px",
                fontSize: 12,
                marginLeft: 8,
                minWidth: 18,
                textAlign: "center",
                flexShrink: 0,
              }}>
                {getUnreadCount(feed)}
              </span>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                handleDeleteFeed(idx);
              }}
              style={{
                marginLeft: 8,
                background: "#eee",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                color: "#b00",
                fontWeight: "bold",
                padding: "2px 8px"
              }}
              title="Удалить фид"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
    {/* Центральная часть */}
    <div
      style={{
        marginLeft: 260,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 100,
      }}
    >
      <div style={{ maxWidth: 700, borderRadius: 8, padding: 24 }}>
        {loading && <div>Загрузка...</div>}
        {!selectedFeed && <div>Выберите фид из списка</div>}
        {selectedFeed && (
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          {selectedFeed.items.slice(0, visibleCount).map((item, idx) => (
            <li
              key={idx}
              style={{
                background: "#fafbfc",
                border: "1px solid #e0e0e0",
                borderRadius: 10,
                boxShadow: "0 2px 8px #0001",
                marginBottom: 24,
                padding: 20,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: "bold", fontSize: 18, marginBottom: 4 }}
              >
                {item.title}
              </a>
              <div style={{ fontSize: 12, color: "#888" }}>{item.pubDate}</div>
              {renderContentWithImages(item.content || item.description || "")}
            </li>
          ))}
          {selectedFeed.items.length === 0 && <li>Нет новостей</li>}
          {visibleCount < selectedFeed.items.length && (
            <li style={{ textAlign: "center", listStyle: "none" }}>
              <button
                onClick={() => setVisibleCount(c => c + 10)}
                style={{
                  margin: "16px auto 0 auto",
                  padding: "10px 32px",
                  borderRadius: 8,
                  border: "1px solid #1976d2",
                  background: "#fff",
                  color: "#1976d2",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 16
                }}
              >
                Загрузить еще
              </button>
            </li>
          )}
        </ul>
        )}
      </div>
    </div>
    {/* Модальное окно для картинки */}
    {modalImage && (
      <div
        style={{
          position: "fixed",
          zIndex: 1000,
          left: 0,
          top: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onClick={() => setModalImage(null)}
      >
        <div
          style={{
            position: "relative",
            background: "#fff",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
            maxWidth: "90vw",
            maxHeight: "90vh"
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setModalImage(null)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 20,
              cursor: "pointer"
            }}
            title="Закрыть"
          >
            ×
          </button>
          <img
            src={modalImage}
            alt=""
            style={{
              maxWidth: "80vw",
              maxHeight: "80vh",
              display: "block",
              margin: "0 auto"
            }}
          />
        </div>
      </div>
    )}
  </div>
);
};

export default App;