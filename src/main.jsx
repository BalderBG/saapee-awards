import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./upload.css";
import "./intro.css";
import "./controls.css";
import "./home-stars.css";
import "./categories.css";
import "./nominations.css";
import "./live-ranking.css";
import { AccessScreen, AdminPage, ProfilePage } from "./local-auth";
import { supabase } from "./supabase";
function Empty({ icon, title, text }) {
  return (
    <div className="empty">
      <b>{icon}</b>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ClipCard({ clip }) {
  return (
    <article className="clip-card">
      <div className="clip-cover youtube-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}`}
          title={clip.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="clip-details">
        <p>{clip.title}</p>
        <small>{clip.author}</small>
        <div>
          <span>♥ 0 votos</span>
          <button>Votar</button>
        </div>
      </div>
    </article>
  );
}
function Intro({ onFinish }) {
  const audio = useRef(null);
  useEffect(() => {
    audio.current?.play().catch(() => {});
    const timer = setTimeout(onFinish, 23000);
    return () => {
      clearTimeout(timer);
      audio.current?.pause();
    };
  }, [onFinish]);
  return (
    <section className="intro-screen">
      <div className="stars" />
      <audio ref={audio} src="/audio/intro-loquendo.mp3" preload="auto" />
      <button onClick={onFinish} className="skip">
        Saltar intro
      </button>
      <button
        onClick={() => {
          audio.current.currentTime = 0;
          audio.current.play();
        }}
        className="sound"
      >
        ♬ Activar sonido
      </button>
      <div className="crawl">
        <p>BIENVENIDOS A...</p>
        <h1>
          SAAAAPEEEEE
          <br />
          RECAP
        </h1>
        <p className="crawl-copy">
          En este evento vamos a valorar la cantidad de clips desastrosos que
          podemos comprobar donde todos nosotros en alguna ocasión como hemos
          soltado posiblemente las mayores barbaridades que se hayan podido
          escuchar de aqui a la galaxia de alli.
        </p>
      </div>
      <div className="intro-bottom">
        SAAAPEE AWARDS <span>·</span> 2026
      </div>
    </section>
  );
}
function Upload({ onClose, onReady }) {
  const [title, setTitle] = useState(""),
    [author, setAuthor] = useState(""),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const getYoutubeId = (value) => {
    try {
      const parsed = new URL(value);
      if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
      if (parsed.hostname.endsWith("youtube.com"))
        return (
          parsed.searchParams.get("v") ||
          parsed.pathname.split("/").filter(Boolean).pop()
        );
    } catch {}
    return null;
  };
  async function submit() {
    const youtubeId = getYoutubeId(url);
    if (!title.trim() || !author.trim() || !url.trim())
      return setError("Completa título, autor y enlace de YouTube.");
    if (!youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId))
      return setError("Introduce un enlace válido de YouTube o youtu.be.");
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return setError("Configura Supabase antes de enviar enlaces.");
    }
    const { data, error: submitError } = await supabase.rpc(
      "submit_youtube_clip",
      {
        clip_title: title.trim(),
        clip_author: author.trim(),
        clip_url: url.trim(),
        clip_youtube_id: youtubeId,
      },
    );
    if (submitError) {
      setLoading(false);
      return setError(submitError.message);
    }
    onReady({
      id: data,
      title: title.trim(),
      author: author.trim(),
      youtubeId,
      status: "pending",
    });
    setLoading(false);
    onClose();
  }
  return (
    <div className="modal-wrap">
      <section className="upload-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <span className="label">NUEVO ENLACE</span>
        <h2>Añade un momento</h2>
        <p>
          Comparte un vídeo de YouTube. No almacenamos ni procesamos archivos.
        </p>
        <label className="field">
          Nombre del clip
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. La noche del karaoke"
          />
        </label>
        <label className="field">
          Autor
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Nombre de quien lo propone"
          />
        </label>
        <label className="field">
          Enlace de YouTube
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
        {error && <p className="upload-error">{error}</p>}
        <button className="submit" disabled={loading} onClick={submit}>
          {loading ? "Comprobando…" : "Enviar enlace para revisión"}
        </button>
      </section>
    </div>
  );
}
function Ranking({ nominations }) {
  const top = nominations.slice(0, 3);
  return (
    <section className="ranking">
      <div className="intro">
        <span>ACTUALIZADO EN DIRECTO</span>
        <h1>Ranking de clips</h1>
        <p>Los momentos que más han conectado con la comunidad.</p>
      </div>
      {nominations.length ? (
        <>
          <div className="live-podium">
            {top.map((nomination, index) => (
              <article
                key={nomination.id}
                className={`live-podium-place place-${index + 1}`}
              >
                <span>{["🥇", "🥈", "🥉"][index]}</span>
                {nomination.photo_url ? (
                  <img src={nomination.photo_url} alt="" />
                ) : (
                  <i>✦</i>
                )}
                <b>{nomination.display_name}</b>
                <small>{nomination.vote_count} votos</small>
              </article>
            ))}
          </div>
          <div className="rank-list">
            {nominations.map((nomination, i) => (
              <div className="rank-row" key={nomination.id}>
                <b>{i + 1}</b>
                <i
                  style={{
                    backgroundImage: nomination.photo_url
                      ? `url(${nomination.photo_url})`
                      : undefined,
                  }}
                />
                <strong>{nomination.display_name}</strong>
                <small>{nomination.vote_count} votos</small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty
          icon="♛"
          title="El ranking aún está vacío"
          text="Cuando los primeros clips reciban votos, aparecerán aquí."
        />
      )}
    </section>
  );
}
function Home({ navigate, upload, replay, clips }) {
  return (
    <section className="home">
      <div className="home-hero">
        <span>BIENVENIDOS A SAAAPEE AWARDS</span>
        <h1>
          Un año entero
          <br />
          en <em>clips.</em>
        </h1>
        <p>
          Primoh aqui se suben los clips y si no ves el boton verde eres
          dislexico
        </p>
        <div className="home-actions">
          <button className="upload-button" onClick={upload}>
            + SUBIR CLIP
          </button>
          <button className="watch-intro" onClick={replay}>
            ↻ Ver animación
          </button>
        </div>
      </div>
      <div className="home-links">
        <button onClick={() => navigate("clips")}>
          <b>▣</b>
          <span>CLIPS DEL MOMENTO</span>
          <small>
            {clips.length ? "Ver y votar los clips" : "Aún no hay clips"}
          </small>
          <i>→</i>
        </button>
        <button onClick={() => navigate("ranking")}>
          <b>♛</b>
          <span>RANKING DE CLIPS</span>
          <small>Los favoritos de la comunidad</small>
          <i>→</i>
        </button>
      </div>
    </section>
  );
}
const defaultCategories = [
  "Frases icónicas por usuario",
  "Caos del año",
  "Peor usuario del año",
  "Mejor usuario del año",
  "Usuario revelación",
  "La user más pickme",
  "Menciones honoríficas",
  "Mayores simps de FP",
];
function Categories({
  categories,
  selected,
  select,
  nominations,
  voted,
  castVote,
}) {
  return (
    <section className="categories-page">
      <div className="categories-intro">
        <span>CATEGORÍAS SAAAPEE AWARDS</span>
        <h1>Nominaciones del año</h1>
        <p>
          Las fichas y nominados se añadirán cuando esté listo el registro de
          participantes.
        </p>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => (
          <button
            key={category.id || category}
            className={
              selected?.id === category.id
                ? "category-card selected"
                : "category-card"
            }
            onClick={() => select(category)}
          >
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{category.name || category}</span>
            <small>
              {selected?.id === category.id
                ? "Categoría seleccionada"
                : "Próximamente"}
            </small>
            <i>→</i>
          </button>
        ))}
      </div>
      {selected?.id && (
        <section className="nominees-section">
          <div className="nominees-head">
            <span>NOMINADOS</span>
            <h2>{selected.name}</h2>
          </div>
          {nominations.length ? (
            <div className="nominee-grid">
              {nominations.map((nomination) => (
                <article className="nominee-card" key={nomination.id}>
                  {nomination.photo_url ? (
                    <img
                      src={nomination.photo_url}
                      alt={`Foto de ${nomination.display_name}`}
                    />
                  ) : (
                    <div className="nominee-avatar">✦</div>
                  )}
                  <div>
                    <h3>{nomination.display_name}</h3>
                    <p>
                      {nomination.description || "Nominado/a de la comunidad."}
                    </p>
                    <small>{nomination.vote_count} votos</small>
                    <button
                      disabled={voted}
                      onClick={() => castVote(nomination.id)}
                    >
                      {voted ? "Voto registrado" : "Votar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              icon="✦"
              title="Aún no hay nominados"
              text="Las fichas aparecerán cuando la administración las publique."
            />
          )}
        </section>
      )}
    </section>
  );
}
function App() {
  const [first, setFirst] = useState(
      () => !localStorage.getItem("recap-intro-seen"),
    ),
    [session, setSession] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("saapee-session"));
      } catch {
        return null;
      }
    }),
    [view, setView] = useState("home"),
    [clips, setClips] = useState([]),
    [menu, setMenu] = useState(false),
    [upload, setUpload] = useState(false),
    [categoriesOpen, setCategoriesOpen] = useState(false),
    [categoryRecords, setCategoryRecords] = useState([]),
    [selectedCategory, setSelectedCategory] = useState(null),
    [nominations, setNominations] = useState([]),
    [ranking, setRanking] = useState([]),
    [voted, setVoted] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("clips")
      .select("id,title,author_name,youtube_id,status")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setClips(
          (data || []).map((clip) => ({
            id: clip.id,
            title: clip.title,
            author: clip.author_name,
            youtubeId: clip.youtube_id,
            status: clip.status,
          })),
        ),
      );
  }, []);
  useEffect(() => {
    const visitorId =
      localStorage.getItem("saapee-visitor") || crypto.randomUUID();
    localStorage.setItem("saapee-visitor", visitorId);
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browserId: visitorId,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("categories")
      .select("id,name,slug,position")
      .eq("active", true)
      .order("position")
      .then(({ data }) => {
        setCategoryRecords(data || []);
        if (data?.length) setSelectedCategory((current) => current || data[0]);
      });
    const loadRanking = () =>
      supabase
        .rpc("get_nomination_ranking")
        .then(({ data }) => setRanking(data || []));
    loadRanking();
    const channel = supabase
      .channel("live-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nomination_vote_totals" },
        loadRanking,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!supabase || !selectedCategory?.id) return;
    supabase
      .rpc("get_category_nominations", { target_category: selectedCategory.id })
      .then(({ data }) => setNominations(data || []));
    supabase
      .from("votes")
      .select("id")
      .eq("category_id", selectedCategory.id)
      .maybeSingle()
      .then(({ data }) => setVoted(Boolean(data)));
  }, [selectedCategory]);
  useEffect(() => {
    if (!supabase || !selectedCategory?.id) return;
    const refreshNominations = () =>
      supabase
        .rpc("get_category_nominations", {
          target_category: selectedCategory.id,
        })
        .then(({ data }) => setNominations(data || []));
    const channel = supabase
      .channel(`category-${selectedCategory.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nomination_vote_totals" },
        refreshNominations,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory]);
  const finish = () => {
      localStorage.setItem("recap-intro-seen", "true");
      setFirst(false);
    },
    replay = () => setFirst(true),
    nav = (v) => {
      setView(v);
      setMenu(false);
    };
  const castVote = async (nominationId) => {
    if (!supabase) return window.alert("Configura Supabase para votar.");
    const { error } = await supabase.rpc("cast_vote", {
      target_nomination: nominationId,
      target_category: selectedCategory.id,
    });
    if (error) return window.alert(error.message);
    setVoted(true);
    const { data } = await supabase.rpc("get_category_nominations", {
      target_category: selectedCategory.id,
    });
    setNominations(data || []);
  };
  if (!session)
    return (
      <AccessScreen
        onLogin={(next) => {
          localStorage.setItem("saapee-session", JSON.stringify(next));
          localStorage.removeItem("recap-intro-seen");
          setFirst(true);
          setSession(next);
        }}
      />
    );
  if (first) return <Intro onFinish={finish} />;
  return (
    <div className="app">
      <header className="mobile">
        <div className="logo">R</div>
        <b>SAAAPEE AWARDS</b>
        <button onClick={() => setMenu(!menu)}>☰</button>
      </header>
      <aside className={menu ? "open" : ""}>
        <div className="brand">
          <div className="logo">R</div>
          <b>SAAAPEE AWARDS</b>
          <small>2026</small>
        </div>
        <div className="event">
          <span>● TORNEO ACTIVO</span>
          <b>Momentos del año</b>
          <small>Aún sin votaciones</small>
        </div>
        <nav>
          <p>EXPLORA</p>
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => nav("home")}
          >
            ⌂ <span>Inicio</span>
          </button>
          <button
            className={view === "clips" ? "active" : ""}
            onClick={() => nav("clips")}
          >
            ▣ <span>Clips del momento</span>
          </button>
          <button
            className={view === "ranking" ? "active" : ""}
            onClick={() => nav("ranking")}
          >
            ♛ <span>Ranking de clips</span>
          </button>
          <button
            className={view === "categories" ? "active" : ""}
            onClick={() => setCategoriesOpen(!categoriesOpen)}
          >
            ◈ <span>Categorías</span>
            <i className="submenu-arrow">{categoriesOpen ? "⌃" : "⌄"}</i>
          </button>
          {categoriesOpen && (
            <div className="category-submenu">
              {(categoryRecords.length
                ? categoryRecords
                : defaultCategories.map((name, position) => ({
                    id: null,
                    name,
                    position,
                  }))
              ).map((category) => (
                <button
                  key={category.id || category.name}
                  onClick={() => {
                    setSelectedCategory(category);
                    nav("categories");
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          <button
            className={view === "profile" ? "active" : ""}
            onClick={() => nav("profile")}
          >
            ◉ <span>Mi perfil</span>
          </button>
          {session.role === "admin" && (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => nav("admin")}
            >
              ⚙ <span>Administración</span>
            </button>
          )}
        </nav>
        <div className="note">
          ✦ <span>Tu voto ayuda a elegir el momento del año.</span>
        </div>
      </aside>
      <main>
        <header className="desk">
          <span>SAAAPEE AWARDS /</span>
          <b>
            {view === "home"
              ? "Inicio"
              : view === "clips"
                ? "Clips del momento"
                : view === "ranking"
                  ? "Ranking de clips"
                  : view === "categories"
                    ? "Categorías"
                    : view === "profile"
                      ? "Mi perfil"
                      : "Administración"}
          </b>
          <div className="header-logo">
            <i>R</i> SAAAPEE AWARDS
          </div>
          <button className="profile-button" onClick={() => nav("profile")}>
            ◉ Mi perfil
          </button>
        </header>
        <div className="content">
          {view === "home" ? (
            <Home
              navigate={nav}
              upload={() => setUpload(true)}
              replay={replay}
              clips={clips}
            />
          ) : view === "clips" ? (
            <>
              <section className="hero">
                <div>
                  <span>ELIGE TU FAVORITO</span>
                  <h1>
                    Los clips del
                    <br />
                    <em>momento.</em>
                  </h1>
                  <p>
                    Un año lleno de recuerdos en pocos segundos. Sube el primero
                    para empezar la colección.
                  </p>
                  <button
                    className="upload-button"
                    onClick={() => setUpload(true)}
                  >
                    + Subir un clip
                  </button>
                </div>
                <div className="orb">✦</div>
              </section>
              <section className="heading">
                <div>
                  <span>COMUNIDAD SAAAPEE AWARDS</span>
                  <h2>Clips del momento</h2>
                </div>
                <button className="outline" onClick={() => setUpload(true)}>
                  + Añadir clip
                </button>
              </section>
              <div className="grid">
                {clips.length ? (
                  clips.map((c) => <ClipCard key={c.id} clip={c} />)
                ) : (
                  <Empty
                    icon="▣"
                    title="Aún no hay clips"
                    text="Añade el primer recuerdo para abrir la votación."
                  />
                )}
              </div>
            </>
          ) : view === "ranking" ? (
            <Ranking nominations={ranking} />
          ) : view === "categories" ? (
            <Categories
              categories={
                categoryRecords.length
                  ? categoryRecords
                  : defaultCategories.map((name, position) => ({
                      id: null,
                      name,
                      position,
                    }))
              }
              selected={selectedCategory}
              select={(category) => {
                setSelectedCategory(category);
                setVoted(false);
              }}
              nominations={nominations}
              voted={voted}
              castVote={castVote}
            />
          ) : view === "profile" ? (
            <ProfilePage
              session={session}
              onLogout={() => {
                localStorage.removeItem("saapee-session");
                setSession(null);
                setView("home");
              }}
            />
          ) : (
            <AdminPage
              session={session}
              onSessionChange={(next) => {
                localStorage.setItem("saapee-session", JSON.stringify(next));
                setSession(next);
              }}
            />
          )}
        </div>
      </main>
      {upload && (
        <Upload
          onClose={() => setUpload(false)}
          onReady={(clip) => setClips((c) => [...c, clip])}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
