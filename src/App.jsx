





// src/App.jsx
import React, { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebaseConfig"; // ensure this file exists and exports auth, googleProvider
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";

/* -----------------------
   Helpers & constants
   ----------------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const CATEGORIES = ["General", "Tech", "Life", "Books", "Art", "Music", "Travel", "Food"];
const EMOJI = { Posts: "✍️", Books: "📚" };

/* small client-side image resize to dataURL */
function resizeImageFileToDataUrl(file, maxWidth = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

/* -----------------------
   Small reusable components
   ----------------------- */

/* StarRow: shows 0-5 stars (filled by rounding) */
function StarRow({ rating = 0, size = 16 }) {
  const filled = Math.round(Math.max(0, Math.min(5, rating)));
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} className={`${i <= filled ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.56L19.335 24 12 19.897 4.665 24 6.3 15.31 0.6 9.75l7.732-1.732L12 .587z"/>
        </svg>
      ))}
    </div>
  );
}

/* QuickStars: average rating display for books */
function QuickStars({ items = [] }) {
  const rated = items.filter(i => i.kind === "Books" && i.rating !== undefined && i.rating !== null);
  const count = rated.length;
  const avg = count ? (rated.reduce((s, r) => s + Number(r.rating || 0), 0) / count) : 0;
  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">⭐ Quick stars</div>
        <div className="text-[10px] text-rose-500">Top picks</div>
      </div>

      <div className="mt-2">
        {count === 0 ? (
          <div className="text-sm text-gray-400">No rated books yet</div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-rose-700">{avg.toFixed(2)} / 5</div>
              <div className="text-xs text-gray-500">{count} rated book{count>1?'s':''}</div>
            </div>
            <div>
              <StarRow rating={avg} size={18} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* QuickStats: placed ONLY in Home */
function QuickStats({ items = [] }) {
  const postsCount = items.filter(i => i.kind === "Posts").length;
  const booksCount = items.filter(i => i.kind === "Books").length;
  const lastCreated = items.length ? new Date(Math.max(...items.map((i) => i.createdAt || 0))) : null;

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-xs text-gray-500">Quick stats</div>
      <div className="mt-2 space-y-2 text-sm text-gray-700">
        <div className="flex justify-between"><div>Posts</div><div className="font-medium">{postsCount}</div></div>
        <div className="flex justify-between"><div>Books</div><div className="font-medium">{booksCount}</div></div>
        <div className="flex justify-between text-gray-500">
          <div>Last update</div>
          <div>{lastCreated ? lastCreated.toLocaleString() : "—"}</div>
        </div>
      </div>
    </div>
  );
}

/* Calendar widget */
function ActivityCalendar({ items = [] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const activeDays = new Set();
  items.forEach((it) => {
    if (!it.createdAt) return;
    const d = new Date(it.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) activeDays.add(d.getDate());
  });

  const activeCount = activeDays.size;
  const percent = Math.round((activeCount / daysInMonth) * 100);

  const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
  const firstDayWeek = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDayWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Activity calendar</div>
          <div className="text-sm font-medium text-rose-700">
            {now.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="text-xs text-gray-500">{activeCount}/{daysInMonth}</div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-rose-100 rounded h-2 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400" style={{ width: `${percent}%` }} />
        </div>
        <div className="text-xs text-gray-500 mt-1">Month progress: <span className="text-rose-600 font-medium">{percent}%</span></div>
      </div>

      <div className="grid grid-cols-7 gap-1 mt-3 text-[10px] text-center text-gray-400">
        {WEEK.map(w => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 mt-2">
        {cells.map((c, idx) => {
          if (c === null) return <div key={idx} className="h-8" />;
          const isActive = activeDays.has(c);
          const date = new Date(year, month, c);
          const isToday = date.getDate() === now.getDate();
          return (
            <div key={idx}
              className={`h-8 flex items-center justify-center text-xs rounded
               ${isActive ? "bg-rose-500 text-white shadow-sm" : "bg-rose-50 text-rose-700"}
               ${isToday ? "ring-2 ring-pink-300" : ""}`}
              title={isActive ? `${c} — activity` : `${c}`}
            >
              {c}
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500">Days with posts/books are highlighted</div>
    </div>
  );
}

/* Recent posts list (clickable) */
function RecentPosts({ items = [], onClick }) {
  const posts = items.filter(i => i.kind === "Posts").sort((a,b)=> (b.createdAt||0)-(a.createdAt||0)).slice(0,3);
  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">📰 Recent posts</div>
        <span className="text-[10px] text-rose-500">Fresh ✨</span>
      </div>
      <div className="mt-2 space-y-2">
        {posts.length === 0 ? <div className="text-sm text-gray-400">No posts yet</div> : posts.map(p => (
          <button key={p.id} onClick={() => onClick(p)} className="w-full flex items-center gap-3 p-2 rounded hover:bg-rose-50 text-left">
            <div className="w-12 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {p.imageData ? <img src={p.imageData} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300">📝</div>}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-rose-700">{p.title || "Untitled post"}</div>
              <div className="text-xs text-gray-500 truncate">{(p.content||"").slice(0,60)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Featured books (clickable) */
function FeaturedBooks({ items = [], onClick }) {
  const books = items.filter(i => i.kind === "Books").slice().sort((a,b)=>{
    const ra = Number(a.rating||0), rb = Number(b.rating||0);
    if (rb !== ra) return rb-ra;
    return (b.createdAt||0)-(a.createdAt||0);
  }).slice(0,3);

  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">📚 Featured books</div>
        <span className="text-[10px] text-rose-500">Readers’ picks</span>
      </div>
      <div className="mt-2 space-y-2">
        {books.length === 0 ? <div className="text-sm text-gray-400">No books yet</div> : books.map(b => (
          <button key={b.id} onClick={() => onClick(b)} className="w-full flex items-center gap-3 p-2 rounded hover:bg-rose-50 text-left">
            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {b.imageData ? <img src={b.imageData} alt={b.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300">📖</div>}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-rose-700">{b.title || "Untitled book"}</div>
              <div className="text-xs text-gray-500">{b.author || ""}{b.rating ? ` • ${Number(b.rating).toFixed(1)}/5` : ""}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -----------------------
   MAIN APP
   ----------------------- */
export default function App() {
  const [tab, setTab] = useState("Home"); // Home | Posts | Books
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("my_blog_data_v1") || "[]"); } catch { return []; }
  });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  // Firebase user state & auth listeners (moved inside component)
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // sign in with popup (Google)
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (err) {
      console.error("Sign in failed:", err);
      alert("Sign in failed. Check console for details.");
    }
  };

  // sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
      alert("Sign out failed. Check console for details.");
    }
  };

  useEffect(() => { localStorage.setItem("my_blog_data_v1", JSON.stringify(items)); }, [items]);

  const publishItem = (payload) => {
    if (editing) {
      setItems(prev => prev.map(it => it.id === editing.id ? { ...it, ...payload, createdAt: Date.now() } : it));
      setEditing(null);
    } else {
      setItems(prev => [payload, ...prev]);
    }
    setTab(payload.kind);
    setQuery("");
  };

  const deleteItem = (id) => {
    if (!confirm("Delete this item?")) return;
    setItems(s => s.filter(x => x.id !== id));
  };

  const resetAll = () => {
    if (!confirm("Reset ALL posts & books?")) return;
    setItems([]);
    localStorage.removeItem("my_blog_data_v1");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "blog-data.json"; a.click();
  };

  const importData = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) throw new Error("Invalid");
        setItems(parsed); alert("Import successful");
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };

  const visible = items.filter(it => {
    if (tab === "Posts" && it.kind !== "Posts") return false;
    if (tab === "Books" && it.kind !== "Books") return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (it.title||"").toLowerCase().includes(q) || (it.content||"").toLowerCase().includes(q) || (it.author||"").toLowerCase().includes(q);
  });

  const postsCount = items.filter(i => i.kind === "Posts").length;
  const booksCount = items.filter(i => i.kind === "Books").length;

  function getBadge(kind) {
    if (kind === "Posts") {
      if (postsCount >= 10) return "🔥 Pro Writer";
      if (postsCount >= 5) return "⭐ Rising Writer";
      if (postsCount >= 1) return "🌱 Newbie Writer";
      return "— No posts yet";
    } else {
      if (booksCount >= 10) return "📖 Book Master";
      if (booksCount >= 5) return "✨ Avid Reader";
      if (booksCount >= 1) return "🌱 Book Explorer";
      return "— No books yet";
    }
  }

  const QUOTES = [
    "Write the thing only you can write.",
    "A small step each day becomes a giant path.",
    "Create for joy, not for perfection.",
    "Share what you learn — others will too.",
    "Reading fuels the mind; writing frees it.",
    "Ideas grow faster when you write them down."
  ];
  function getQuoteOfDay() {
    const now = new Date();
    const idx = (now.getDate() + now.getMonth() + now.getFullYear()) % QUOTES.length;
    return QUOTES[idx];
  }

  const quote = getQuoteOfDay();

  // helpers for clicking recent/featured cards
  const goToPost = (p) => { setTab("Posts"); setQuery(p.title || ""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goToBook = (b) => { setTab("Books"); setQuery(b.title || ""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="min-h-screen flex flex-col bg-rose-50">
      {/* NAV */}
      <nav className="bg-rose-100 border-b border-rose-200">
        <div className="max-w-[100%] mx-0 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-rose-700">✨ BLOG BY PINKY ✨</h1>
            </div>

            <div className="ml-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-rose-700">Welcome, {user.displayName || user.email}</span>
                  <button onClick={logout} className="px-3 py-1 bg-white border rounded text-rose-700">Sign out</button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} className="px-3 py-1 bg-rose-600 text-white rounded">Sign in with Google</button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => { setTab("Home"); setQuery(""); }} className={`px-3 py-1 rounded ${tab==="Home" ? "bg-rose-600 text-white" : "bg-white border text-rose-700"}`}>Home</button>
            <button onClick={() => { setTab("Posts"); setQuery(""); }} className={`px-3 py-1 rounded ${tab==="Posts" ? "bg-rose-600 text-white" : "bg-white border text-rose-700"}`}>{EMOJI.Posts} Posts</button>
            <button onClick={() => { setTab("Books"); setQuery(""); }} className={`px-3 py-1 rounded ${tab==="Books" ? "bg-rose-600 text-white" : "bg-white border text-rose-700"}`}>{EMOJI.Books} Books</button>

            <label className="px-3 py-1 border rounded cursor-pointer bg-white">
              Import
              <input onChange={importData} type="file" accept=".json" className="hidden" />
            </label>
            <button onClick={exportData} className="px-3 py-1 border rounded bg-white">Export</button>
            <button onClick={resetAll} className="px-3 py-1 border rounded bg-white">Reset All</button>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="flex-grow w-full px-6 py-8">
        {/* HOME: left welcome (wide) and strict right column (widgets) */}
        {tab === "Home" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-full flex flex-col lg:flex-row items-start gap-8">
              {/* LEFT - WELCOME (wide) */}
              <div className="flex-1 lg:w-[60%]">
                <h2 className="text-5xl font-extrabold text-rose-700 uppercase whitespace-nowrap">WELCOME TO BLOG BY PINKY</h2>
                <p className="mt-3 text-lg text-gray-600 max-w-2xl">Share your thoughts with quick posts or the common books you love.</p>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setTab("Posts"); setQuery(""); }} className="bg-rose-500 text-white px-4 py-2 rounded shadow">{EMOJI.Posts} Open Posts</button>
                  <button onClick={() => { setTab("Books"); setQuery(""); }} className="bg-white border text-rose-700 px-4 py-2 rounded shadow">{EMOJI.Books} Open Books</button>
                </div>

                <div className="mt-8 space-y-6">
                  <motion.div whileHover={{ scale: 1.01 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded shadow">
                    <h3 className="font-semibold text-rose-700">{EMOJI.Posts} Posts</h3>
                    <p className="text-sm text-gray-600 mt-2">Write short posts, share ideas and stories.</p>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.01 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded shadow">
                    <h3 className="font-semibold text-rose-700">{EMOJI.Books} Books</h3>
                    <p className="text-sm text-gray-600 mt-2">Recommend books and add a short review.</p>
                  </motion.div>
                </div>
              </div>

              {/* RIGHT - strict right column */}
              <aside className="w-full lg:w-[32%] xl:w-[28%] flex-shrink-0 space-y-4">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded shadow">
                  <div className="text-xs text-gray-500">Quote of the day</div>
                  <div className="mt-2 text-sm font-medium text-gray-700">“{quote}”</div>
                </motion.div>

                <RecentPosts items={items} onClick={goToPost} />
                <FeaturedBooks items={items} onClick={goToBook} />

                {/* QuickStats moved here — ONLY on Home */}
                <QuickStats items={items} />

                {/* QuickStars */}
                <QuickStars items={items} />

                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded shadow">
                  <ActivityCalendar items={items} />
                </motion.div>
              </aside>
            </div>
          </motion.div>
        )}

        {/* POSTS / BOOKS pages */}
        {(tab === "Posts" || tab === "Books") && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: form + list */}
            <div className="flex-1">
              <Form kind={tab} onPublish={publishItem} editing={editing} setEditing={setEditing} />

              <div className="flex gap-4 items-center mt-4">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title/content/author" className="flex-1 border p-2 rounded" />
                <div className="space-x-2">
                  <button onClick={() => setQuery("")} className="px-3 py-1 border rounded bg-white">Clear</button>
                </div>
              </div>

              <div className="mt-6">
                {visible.length === 0 ? (
                  <p className="text-gray-500">No items yet.</p>
                ) : (
                  visible.map(it => (
                    <motion.div key={it.id} layout initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28 }} className="bg-white p-4 rounded shadow mb-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            {it.imageData ? <img src={it.imageData} alt={it.title||"image"} className="w-24 h-16 object-cover rounded" onError={(e)=>{e.target.style.display='none'}} /> : <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-300">No image</div>}
                            <div className="flex-1">
                              <h4 className="font-semibold">{(EMOJI[it.kind] ? EMOJI[it.kind]+" " : "")}{it.title || (it.kind==="Books" ? "Untitled book" : "Untitled post")}</h4>
                              <div className="text-sm text-gray-600 mt-1">{it.content}</div>
                              {it.author && <div className="text-xs text-gray-500 mt-1"><strong>Author:</strong> {it.author}</div>}
                              <div className="text-xs text-gray-500 mt-1">{new Date(it.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">Category: {it.category}</div>
                        </div>

                        <div className="text-right">
                          <div className="mt-2 space-y-1">
                            <button onClick={() => setEditing(it)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border rounded">Edit</button>
                            <button onClick={() => deleteItem(it.id)} className="px-2 py-1 text-xs bg-red-50 text-red-700 border rounded">Delete</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Right: badge widget */}
            <aside className="lg:w-1/4 space-y-4">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded shadow">
                <div className="text-xs text-gray-500">🏅 Your Badge</div>
                <div className="mt-2 text-sm font-semibold text-rose-700">{getBadge(tab)}</div>
                <div className="text-xs text-gray-500 mt-2">Badges update automatically as you add items.</div>
              </motion.div>
            </aside>
          </div>
        )}
      </div>

      <footer className="bg-rose-100 border-t py-4 text-center text-sm text-rose-700">
        Made with ❤️ by Priyanka
      </footer>
    </div>
  );
}

/* -----------------------
   Form component (create/edit)
   ----------------------- */
function Form({ kind, onPublish, editing, setEditing }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState("");
  const [rating, setRating] = useState("");

  useEffect(() => {
    if (editing) {
      setTitle(editing.title || "");
      setContent(editing.content || "");
      setAuthor(editing.author || "");
      setCategory(editing.category || CATEGORIES[0]);
      setImagePreview(editing.imageData || "");
      setImageData(editing.imageData || "");
      setRating(editing.rating || "");
    } else {
      setTitle(""); setContent(""); setAuthor(""); setCategory(CATEGORIES[0]); setImagePreview(""); setImageData(""); setRating("");
    }
  }, [editing, kind]);

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    try {
      const resized = await resizeImageFileToDataUrl(file);
      setImageData(resized);
    } catch (err) {
      console.error(err);
      alert("Could not process image.");
      setImagePreview(""); setImageData("");
    }
  };

  const submit = () => {
    if (kind === "Books" && !title.trim()) { alert("Book title is required."); return; }
    if (kind === "Posts" && !title.trim() && !content.trim()) { alert("Add a title or content to publish."); return; }

    const obj = {
      id: editing ? editing.id : uid(),
      kind,
      title: title.trim(),
      content: content.trim(),
      author: author.trim(),
      category,
      imageData: imageData || "",
      rating: rating ? Number(rating) : undefined,
      createdAt: editing ? editing.createdAt : Date.now(),
    };

    onPublish(obj);
    if (editing) setEditing(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">{EMOJI[kind]} {editing ? `Edit ${kind.slice(0,-1)}` : `New ${kind.slice(0,-1)}`}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={kind==="Books" ? "Book title (required)" : "Post title (optional)"} className="w-full border p-2 rounded mb-2" />
        <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full border p-2 rounded mb-2">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder={kind==="Books" ? "Short review or why you like this book..." : "Post content..."} rows={4} className="w-full border p-2 rounded mb-2" />

      {kind === "Books" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <input value={author} onChange={(e)=>setAuthor(e.target.value)} placeholder="Author" className="w-full border p-2 rounded" />
          <input value={rating} onChange={(e)=>setRating(e.target.value)} placeholder="Rating (0-5)" type="number" min="0" max="5" step="0.1" className="w-full border p-2 rounded" />
        </div>
      )}

      {kind === "Posts" && (
        <input value={author} onChange={(e)=>setAuthor(e.target.value)} placeholder="Author (optional)" className="w-full border p-2 rounded mb-2" />
      )}

      <div className="mb-2">
        <label className="block text-sm text-gray-600 mb-1">Image (optional)</label>
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 bg-white border rounded cursor-pointer">
            Choose image
            <input type="file" accept="image/*" onChange={(e)=>handleFile(e.target.files?.[0])} className="hidden" />
          </label>
          {imagePreview ? (
            <div className="flex items-center gap-2">
              <img src={imagePreview} alt="preview" className="w-28 h-20 object-cover rounded border" />
              <div className="flex flex-col">
                <button type="button" onClick={() => { setImagePreview(""); setImageData(""); }} className="text-sm text-red-600">Remove</button>
                <div className="text-xs text-gray-500">Preview (original)</div>
              </div>
            </div>
          ) : <div className="text-sm text-gray-500">No image selected</div>}
        </div>
        <div className="mt-2 text-xs text-gray-500">Images are resized client-side for demo. Use an image host for production.</div>
      </div>

      <div className="flex gap-2 mt-3">
        <motion.button whileTap={{ scale: 0.96 }} onClick={submit} className="bg-rose-500 text-white px-4 py-2 rounded">{editing ? "Update" : "Publish"}</motion.button>
        {editing ? <button onClick={() => setEditing(null)} className="px-3 py-2 border rounded">Cancel</button> : <button onClick={() => { setTitle(""); setContent(""); setAuthor(""); setCategory(CATEGORIES[0]); setImagePreview(""); setImageData(""); setRating(""); }} className="px-3 py-2 border rounded">Reset</button>}
      </div>
    </motion.div>
  );
}