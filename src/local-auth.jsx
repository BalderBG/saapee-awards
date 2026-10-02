import { useEffect, useState } from "react";
import "./local-auth.css";
export function AccessScreen({ onLogin }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onLogin(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="access-screen">
      <form onSubmit={submit} className="access-card">
        <div className="access-logo">R</div>
        <span>ACCESO LOCAL</span>
        <h1>SAAAPEE AWARDS</h1>
        <p>Inicia sesión antes de entrar a la experiencia.</p>
        <label>
          Usuario
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="access-error">{error}</div>}
        <button disabled={busy}>{busy ? "Comprobando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
export function AdminPage({ session, onSessionChange }) {
  const [tab, setTab] = useState("participants"),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [photoUrl, setPhotoUrl] = useState(""),
    [newUsername, setNewUsername] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [newRole, setNewRole] = useState("guest"),
    [newActive, setNewActive] = useState(true),
    [newCategory, setNewCategory] = useState(""),
    [editingCategory, setEditingCategory] = useState(null),
    [editCategoryName, setEditCategoryName] = useState(""),
    [editing, setEditing] = useState(null),
    [editUsername, setEditUsername] = useState(""),
    [editPassword, setEditPassword] = useState(""),
    [message, setMessage] = useState(""),
    [data, setData] = useState({
      clips: [],
      participants: [],
      votes: [],
      categories: [],
      visits: [],
      users: [],
    });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.token}`,
  };
  const load = async () => {
    const response = await fetch("/api/admin/data", {
      headers: { Authorization: headers.Authorization },
    });
    if (response.ok) setData(await response.json());
  };
  useEffect(() => {
    load();
  }, []);
  const save = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/participants", {
        method: "POST",
        headers,
        body: JSON.stringify({ name, description, photoUrl }),
      }),
      result = await response.json();
    setMessage(response.ok ? "Participante guardado." : result.error);
    if (response.ok) {
      setName("");
      setDescription("");
      setPhotoUrl("");
      load();
    }
  };
  const review = async (id, status) => {
    const response = await fetch(`/api/clips/${id}/review`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status }),
      }),
      result = await response.json();
    setMessage(
      response.ok
        ? `Clip ${status === "approved" ? "aprobado" : "rechazado"}.`
        : result.error,
    );
    load();
  };
  const createAccount = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          active: newActive,
        }),
      }),
      result = await response.json();
    setMessage(
      response.ok ? `Cuenta ${result.username} creada.` : result.error,
    );
    if (response.ok) {
      setNewUsername("");
      setNewPassword("");
      setNewRole("guest");
      setNewActive(true);
      load();
    }
  };
  const updateAccount = async (username, update) => {
    const response = await fetch(
        `/api/admin/users/${encodeURIComponent(username)}`,
        { method: "PATCH", headers, body: JSON.stringify(update) },
      ),
      result = await response.json();
    setMessage(
      response.ok ? `Cuenta ${result.username} actualizada.` : result.error,
    );
    if (
      response.ok &&
      username === session.username &&
      result.username !== username
    )
      onSessionChange?.({ ...session, username: result.username });
    load();
  };
  const openEdit = (user) => {
    setEditing(user.username);
    setEditUsername(user.username);
    setEditPassword("");
  };
  const saveAccountEdit = async (event) => {
    event.preventDefault();
    const update = { username: editUsername };
    if (editPassword) update.password = editPassword;
    await updateAccount(editing, update);
    setEditing(null);
  };
  const deleteAccount = async (username) => {
    if (
      !window.confirm(
        `¿Eliminar la cuenta ${username}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    const response = await fetch(
        `/api/admin/users/${encodeURIComponent(username)}`,
        { method: "DELETE", headers: { Authorization: headers.Authorization } },
      ),
      result = await response.json();
    setMessage(response.ok ? `Cuenta ${username} eliminada.` : result.error);
    if (response.ok) load();
  };
  const createCategory = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newCategory }),
      }),
      result = await response.json();
    setMessage(response.ok ? `Categoría ${result.name} creada.` : result.error);
    if (response.ok) {
      setNewCategory("");
      load();
    }
  };
  const updateCategory = async (id, update) => {
    const response = await fetch(
        `/api/admin/categories/${encodeURIComponent(id)}`,
        { method: "PATCH", headers, body: JSON.stringify(update) },
      ),
      result = await response.json();
    setMessage(
      response.ok ? `Categoría ${result.name} actualizada.` : result.error,
    );
    if (response.ok) load();
  };
  const saveCategoryEdit = async (event) => {
    event.preventDefault();
    await updateCategory(editingCategory, { name: editCategoryName });
    setEditingCategory(null);
  };
  const deleteCategory = async (category) => {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    const response = await fetch(
        `/api/admin/categories/${encodeURIComponent(category.id)}`,
        { method: "DELETE", headers: { Authorization: headers.Authorization } },
      ),
      result = await response.json();
    setMessage(
      response.ok ? `Categoría ${category.name} eliminada.` : result.error,
    );
    if (response.ok) load();
  };
  const zones = [
    ...new Set(data.visits.map((visit) => visit.timezone).filter(Boolean)),
  ];
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <span>GESTIÓN LOCAL</span>
        <h1>Administración</h1>
        <p>
          Gestiona participantes, revisa los enlaces y consulta el uso de la
          página.
        </p>
      </div>
      <section className="admin-panel">
        <header>
          <strong>Panel de control</strong>
          <button onClick={load}>↻</button>
        </header>
        <nav>
          {[
            ["participants", "Participantes"],
            ["clips", "Revisar clips"],
            ["categories", "Categorías"],
            ["accounts", "Cuentas"],
            ["stats", "Estadísticas"],
          ].map(([id, label]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "participants" && (
          <>
            <form onSubmit={save}>
              <input
                placeholder="Nombre"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                placeholder="URL de foto (opcional)"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
              />
              <textarea
                placeholder="Descripción"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <button>Guardar participante</button>
            </form>
            <small>{data.participants.length} participantes guardados</small>
          </>
        )}
        {tab === "clips" && (
          <div className="admin-list">
            {data.clips.filter((clip) => clip.status === "pending").length ? (
              data.clips
                .filter((clip) => clip.status === "pending")
                .map((clip) => (
                  <article key={clip.id}>
                    <b>{clip.title}</b>
                    <small>{clip.author}</small>
                    <a
                      href={`https://youtu.be/${clip.youtubeId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver YouTube ↗
                    </a>
                    <div>
                      <button onClick={() => review(clip.id, "rejected")}>
                        Rechazar
                      </button>
                      <button onClick={() => review(clip.id, "approved")}>
                        Aprobar
                      </button>
                    </div>
                  </article>
                ))
            ) : (
              <small>No hay clips pendientes.</small>
            )}
          </div>
        )}
        {tab === "stats" && (
          <div className="stats-local">
            <b>
              {data.visits.length}
              <small>visitas únicas</small>
            </b>
            <b>
              {data.clips.length}
              <small>clips enviados</small>
            </b>
            <b>
              {data.votes.length}
              <small>votos registrados</small>
            </b>
            <p>
              Zonas horarias detectadas:{" "}
              {zones.length ? zones.join(", ") : "sin datos todavía"}.
            </p>
            <small>La ubicación precisa no se recopila.</small>
          </div>
        )}
        {tab === "categories" && (
          <div className="categories-admin">
            <form onSubmit={createCategory} className="category-create-form">
              <div>
                <span>ORGANIZACIÓN DEL EVENTO</span>
                <h2>Nueva categoría</h2>
                <small>{data.categories.length} categorías gestionables</small>
              </div>
              <input
                placeholder="Nombre de la categoría"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              />
              <button>+ Crear categoría</button>
            </form>
            <div className="categories-list">
              {data.categories.map((category, index) => {
                const isActive = category.active !== false;
                return (
                  <article
                    className={
                      isActive ? "category-row" : "category-row inactive"
                    }
                    key={category.id}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div>
                      <strong>{category.name}</strong>
                      <small>
                        {isActive
                          ? "Visible para usuarios"
                          : "Oculta para usuarios"}
                      </small>
                    </div>
                    <label
                      className={isActive ? "status active" : "status inactive"}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(event) =>
                          updateCategory(category.id, {
                            active: event.target.checked,
                          })
                        }
                      />
                      {isActive ? "Activa" : "Oculta"}
                    </label>
                    <div className="category-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(category.id);
                          setEditCategoryName(category.name);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {editingCategory && (
              <form className="category-edit-form" onSubmit={saveCategoryEdit}>
                <label>
                  Renombrar categoría
                  <input
                    value={editCategoryName}
                    onChange={(event) =>
                      setEditCategoryName(event.target.value)
                    }
                  />
                </label>
                <button>Guardar</button>
                <button type="button" onClick={() => setEditingCategory(null)}>
                  Cancelar
                </button>
              </form>
            )}
          </div>
        )}
        {tab === "accounts" && (
          <div className="accounts-admin">
            <form onSubmit={createAccount} className="account-form">
              <h2>Crear cuenta</h2>
              <input
                placeholder="Nombre de usuario"
                value={newUsername}
                onChange={(event) =>
                  setNewUsername(event.target.value.toLowerCase())
                }
              />
              <input
                type="password"
                placeholder="Contraseña personalizada"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <select
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
              >
                <option value="guest">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
              <label className="account-status">
                <input
                  type="checkbox"
                  checked={newActive}
                  onChange={(event) => setNewActive(event.target.checked)}
                />{" "}
                Activado
              </label>
              <button>Crear cuenta</button>
            </form>
            <div className="accounts-list">
              {data.users.map((user) => (
                <article key={user.username}>
                  <div>
                    <b>{user.username}</b>
                    <small>
                      {user.role === "admin" ? "Administrador" : "Usuario"}
                    </small>
                  </div>
                  <select
                    value={user.role}
                    onChange={(event) =>
                      updateAccount(user.username, { role: event.target.value })
                    }
                  >
                    <option value="guest">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <label
                    className={
                      user.active ? "status active" : "status inactive"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={(event) =>
                        updateAccount(user.username, {
                          active: event.target.checked,
                        })
                      }
                    />
                    {user.active ? "Activado" : "Desactivado"}
                  </label>
                  <div className="account-actions">
                    <button type="button" onClick={() => openEdit(user)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="delete-account"
                      onClick={() => deleteAccount(user.username)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {editing && (
              <form className="account-edit-form" onSubmit={saveAccountEdit}>
                <div>
                  <span>EDITAR CUENTA</span>
                  <h2>{editing}</h2>
                </div>
                <label>
                  Nombre de usuario
                  <input
                    value={editUsername}
                    onChange={(event) =>
                      setEditUsername(event.target.value.toLowerCase())
                    }
                  />
                </label>
                <label>
                  Nueva contraseña <small>Opcional</small>
                  <input
                    type="password"
                    placeholder="Déjala vacía para conservarla"
                    value={editPassword}
                    onChange={(event) => setEditPassword(event.target.value)}
                  />
                </label>
                <div className="account-edit-actions">
                  <button>Guardar cambios</button>
                  <button type="button" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {message && <small className="admin-message">{message}</small>}
      </section>
    </section>
  );
}

export function ProfilePage({ session, onLogout }) {
  const isAdmin = session.role === "admin";
  const [profile, setProfile] = useState({
      description: "",
      gender: "",
      genderCustom: "",
      avatarUrl: "",
    }),
    [avatarData, setAvatarData] = useState(null),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) setProfile(data);
      });
  }, [session.token]);
  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return setMessage("Selecciona una imagen PNG, JPG o WEBP.");
    if (file.size > 1.5 * 1024 * 1024)
      return setMessage("La foto debe pesar como máximo 1,5 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarData(reader.result);
      setMessage("Foto lista para guardar.");
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          description: profile.description,
          gender: profile.gender,
          genderCustom: profile.genderCustom,
          ...(avatarData ? { avatarDataUrl: avatarData } : {}),
        }),
      }),
      result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error);
    setProfile(result);
    setAvatarData(null);
    setMessage("Perfil guardado.");
  };
  const genderLabel = {
    woman: "Mujer",
    man: "Hombre",
    nonbinary: "Persona no binaria",
    prefer_not_to_say: "Prefiere no indicarlo",
  };
  const avatar = avatarData || profile.avatarUrl;
  return (
    <section className="profile-page">
      <div className="profile-heading">
        <span>PERFIL LOCAL</span>
        <h1>Mi perfil</h1>
        <p>
          Esta es la base de tu carta. Más adelante podremos personalizarla.
        </p>
      </div>
      <article className="profile-card">
        <div className="profile-card-glow" />
        <div className="profile-card-top">
          <span>CARTA DE TEMPORADA</span>
          <b>2026</b>
        </div>
        <div className="profile-avatar" aria-label="Foto de perfil">
          {avatar ? (
            <img src={avatar} alt={`Foto de perfil de ${session.username}`} />
          ) : (
            session.username.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="profile-identity">
          <small>USUARIO</small>
          <h2>{session.username}</h2>
          <span className={isAdmin ? "profile-role admin" : "profile-role"}>
            {isAdmin ? "Administrador" : "Usuario invitado"}
          </span>
          {(profile.gender || profile.genderCustom) && (
            <p className="profile-gender">
              {profile.gender === "self_described"
                ? profile.genderCustom
                : genderLabel[profile.gender]}
            </p>
          )}
        </div>
        {profile.description && (
          <p className="profile-description">{profile.description}</p>
        )}
        <div className="profile-stats">
          <div>
            <b>—</b>
            <small>Clips</small>
          </div>
          <div>
            <b>—</b>
            <small>Votos</small>
          </div>
          <div>
            <b>ON</b>
            <small>Cuenta</small>
          </div>
        </div>
        <p className="profile-card-note">
          SAAAPEE AWARDS · MIEMBRO DE LA COMUNIDAD
        </p>
      </article>
      <form className="profile-editor" onSubmit={saveProfile}>
        <div className="profile-editor-title">
          <span>PERSONALIZA TU CARTA</span>
          <h2>Datos del perfil</h2>
        </div>
        <label className="avatar-upload">
          <span>Foto de perfil</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={chooseAvatar}
          />
          <b>Subir foto · PNG, JPG o WEBP</b>
          <small>Máximo 1,5 MB</small>
        </label>
        <label>
          Descripción
          <textarea
            maxLength="280"
            placeholder="Cuéntanos algo sobre ti…"
            value={profile.description}
            onChange={(event) =>
              setProfile({ ...profile, description: event.target.value })
            }
          />
        </label>
        <label>
          Género <small>Opcional</small>
          <select
            value={profile.gender}
            onChange={(event) =>
              setProfile({
                ...profile,
                gender: event.target.value,
                genderCustom: "",
              })
            }
          >
            <option value="">Sin especificar</option>
            <option value="woman">Mujer</option>
            <option value="man">Hombre</option>
            <option value="nonbinary">Persona no binaria</option>
            <option value="self_described">Prefiero describirme</option>
            <option value="prefer_not_to_say">Prefiero no indicarlo</option>
          </select>
        </label>
        {profile.gender === "self_described" && (
          <label>
            Cómo quieres describirte
            <input
              maxLength="60"
              placeholder="Escribe la descripción con la que te identifiques"
              value={profile.genderCustom}
              onChange={(event) =>
                setProfile({ ...profile, genderCustom: event.target.value })
              }
            />
          </label>
        )}
        <div className="profile-editor-actions">
          <small>{message}</small>
          <button disabled={saving}>
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
      <div className="profile-actions">
        <p>Tu perfil está activo y listo para participar.</p>
        <button onClick={onLogout}>Cerrar sesión</button>
      </div>
    </section>
  );
}
