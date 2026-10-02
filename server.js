const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = __dirname;
const staticRoot = path.join(root, "dist");
const dataDir = path.join(root, "data");
const profilesDir = path.join(root, "uploads", "profiles");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(profilesDir, { recursive: true });
const files = {
  clips: path.join(dataDir, "clips.json"),
  participants: path.join(dataDir, "participants.json"),
  votes: path.join(dataDir, "votes.json"),
  categories: path.join(dataDir, "categories.json"),
  users: path.join(dataDir, "users.json"),
  visits: path.join(dataDir, "visits.json"),
};
const loadLocalEnvironment = () => {
  const envFile = path.join(root, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined)
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
};
loadLocalEnvironment();
const passwordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
};
const initialAdminUsername = String(process.env.ADMIN_USERNAME || "")
  .toLowerCase()
  .trim();
const initialAdminPassword = String(process.env.ADMIN_PASSWORD || "");
const starterUsers =
  /^[a-z0-9_-]{3,24}$/.test(initialAdminUsername) &&
  initialAdminPassword.length >= 8
    ? [
        {
          username: initialAdminUsername,
          role: "admin",
          active: true,
          passwordHash: passwordHash(initialAdminPassword),
        },
      ]
    : [];
const starterCategories = [
  "Frases icónicas por usuario",
  "Caos del año",
  "Peor usuario del año",
  "Mejor usuario del año",
  "Usuario revelación",
  "La user más pickme",
  "Menciones honoríficas",
  "Mayores simps de FP",
].map((name, index) => ({
  id: String(index + 1),
  name,
  position: index + 1,
  active: true,
}));
for (const [name, file] of Object.entries(files))
  if (!fs.existsSync(file))
    fs.writeFileSync(
      file,
      JSON.stringify(
        name === "users"
          ? starterUsers
          : name === "categories"
            ? starterCategories
            : [],
        null,
        2,
      ),
    );
const sessions = new Map();
const read = (name) => JSON.parse(fs.readFileSync(files[name], "utf8"));
const write = (name, value) =>
  fs.writeFileSync(files[name], JSON.stringify(value, null, 2));
const send = (res, status, value) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
};
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(text || "{}"));
      } catch {
        reject();
      }
    });
  });
const verify = (password, stored) => {
  const [salt, hash] = stored.split(":");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    crypto.scryptSync(password, salt, 64),
  );
};
const sessionFor = (req) =>
  sessions.get(req.headers.authorization?.replace("Bearer ", ""));
const publicProfile = (user) => ({
  username: user.username,
  description: user.description || "",
  gender: user.gender || "",
  genderCustom: user.genderCustom || "",
  avatarUrl: user.avatarUrl || "",
});
const youtubeId = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.hostname.endsWith("youtube.com"))
      return (
        url.searchParams.get("v") ||
        url.pathname.split("/").filter(Boolean).pop()
      );
  } catch {}
  return null;
};
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/login") {
    try {
      const input = await parseBody(req);
      const user = read("users").find(
        (item) => item.username === String(input.username || "").toLowerCase(),
      );
      if (!user || !verify(String(input.password || ""), user.passwordHash))
        return send(res, 401, { error: "Usuario o contraseña incorrectos" });
      if (user.active === false)
        return send(res, 403, { error: "Esta cuenta no está activa" });
      const token = crypto.randomUUID();
      sessions.set(token, { username: user.username, role: user.role });
      return send(res, 200, {
        token,
        username: user.username,
        role: user.role,
      });
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "GET" && req.url === "/api/profile") {
    const session = sessionFor(req);
    if (!session)
      return send(res, 401, { error: "Inicia sesión para ver tu perfil" });
    const user = read("users").find(
      (item) => item.username === session.username,
    );
    if (!user) return send(res, 404, { error: "Cuenta no encontrada" });
    return send(res, 200, publicProfile(user));
  }
  if (req.method === "PUT" && req.url === "/api/profile") {
    const session = sessionFor(req);
    if (!session)
      return send(res, 401, { error: "Inicia sesión para editar tu perfil" });
    try {
      const input = await parseBody(req);
      const users = read("users");
      const user = users.find((item) => item.username === session.username);
      if (!user) return send(res, 404, { error: "Cuenta no encontrada" });
      const allowedGenders = [
        "",
        "woman",
        "man",
        "nonbinary",
        "self_described",
        "prefer_not_to_say",
      ];
      const gender = String(input.gender ?? user.gender ?? "");
      if (!allowedGenders.includes(gender))
        return send(res, 400, { error: "Identidad de género no válida" });
      user.description = String(input.description ?? user.description ?? "")
        .trim()
        .slice(0, 280);
      user.gender = gender;
      user.genderCustom =
        gender === "self_described"
          ? String(input.genderCustom ?? user.genderCustom ?? "")
              .trim()
              .slice(0, 60)
          : "";
      if (input.removeAvatar === true && user.avatarUrl) {
        const oldFile = path.resolve(root, user.avatarUrl.replace(/^\//, ""));
        if (oldFile.startsWith(profilesDir) && fs.existsSync(oldFile))
          fs.unlinkSync(oldFile);
        user.avatarUrl = "";
      }
      if (typeof input.avatarDataUrl === "string" && input.avatarDataUrl) {
        const match = input.avatarDataUrl.match(
          /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/,
        );
        if (!match)
          return send(res, 400, { error: "Usa una imagen PNG, JPG o WEBP" });
        const image = Buffer.from(match[2], "base64");
        if (!image.length || image.length > 1.5 * 1024 * 1024)
          return send(res, 400, { error: "La foto no puede superar 1,5 MB" });
        const extension = match[1] === "jpeg" ? "jpg" : match[1];
        const fileName = `${user.username}-${crypto.randomUUID()}.${extension}`;
        const imagePath = path.join(profilesDir, fileName);
        fs.writeFileSync(imagePath, image);
        if (user.avatarUrl) {
          const oldFile = path.resolve(root, user.avatarUrl.replace(/^\//, ""));
          if (oldFile.startsWith(profilesDir) && fs.existsSync(oldFile))
            fs.unlinkSync(oldFile);
        }
        user.avatarUrl = `/uploads/profiles/${fileName}`;
      }
      write("users", users);
      return send(res, 200, publicProfile(user));
    } catch {
      return send(res, 400, { error: "Datos de perfil inválidos" });
    }
  }
  if (req.method === "GET" && req.url === "/api/data")
    return send(res, 200, {
      clips: read("clips"),
      participants: read("participants"),
      votes: read("votes"),
      categories: read("categories")
        .filter((category) => category.active !== false)
        .map((category, index) => ({
          ...category,
          id: String(category.id),
          position: Number(category.position) || index + 1,
          active: category.active !== false,
        })),
    });
  if (req.method === "POST" && req.url === "/api/participants") {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede añadir participantes",
      });
    try {
      const input = await parseBody(req);
      const people = read("participants");
      const participant = {
        id: crypto.randomUUID(),
        name: String(input.name || "").slice(0, 80),
        description: String(input.description || "").slice(0, 280),
        photoUrl: String(input.photoUrl || "").slice(0, 500),
      };
      if (!participant.name)
        return send(res, 400, { error: "Falta el nombre" });
      people.push(participant);
      write("participants", people);
      return send(res, 201, participant);
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "POST" && req.url === "/api/clips") {
    try {
      const input = await parseBody(req);
      const id = youtubeId(input.youtubeUrl);
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id))
        return send(res, 400, {
          error: "Solo se admiten enlaces de YouTube válidos",
        });
      const clips = read("clips");
      const clip = {
        id: crypto.randomUUID(),
        title: String(input.title || "").slice(0, 100),
        author: String(input.author || "").slice(0, 80),
        youtubeId: id,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      if (!clip.title || !clip.author)
        return send(res, 400, { error: "Faltan datos" });
      clips.unshift(clip);
      write("clips", clips);
      return send(res, 201, clip);
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "POST" && req.url === "/api/visit") {
    try {
      const input = await parseBody(req);
      const visits = read("visits");
      const browserId = String(input.browserId || "").slice(0, 80);
      if (browserId && !visits.some((visit) => visit.browserId === browserId)) {
        visits.push({
          browserId,
          language: String(input.language || "").slice(0, 30),
          timezone: String(input.timezone || "").slice(0, 80),
          firstSeen: new Date().toISOString(),
        });
        write("visits", visits);
      }
      return send(res, 201, { ok: true });
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "GET" && req.url === "/api/admin/data") {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede ver las estadísticas",
      });
    return send(res, 200, {
      clips: read("clips"),
      participants: read("participants"),
      votes: read("votes"),
      categories: read("categories").map((category, index) => ({
        ...category,
        id: String(category.id),
        position: Number(category.position) || index + 1,
        active: category.active !== false,
      })),
      visits: read("visits"),
      users: read("users").map(({ username, role, active }) => ({
        username,
        role,
        active: active !== false,
      })),
    });
  }
  if (req.method === "POST" && req.url === "/api/admin/categories") {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede crear categorías",
      });
    try {
      const input = await parseBody(req);
      const name = String(input.name || "")
        .trim()
        .slice(0, 80);
      if (!name)
        return send(res, 400, { error: "Falta el nombre de la categoría" });
      const categories = read("categories");
      if (
        categories.some(
          (category) => category.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return send(res, 409, { error: "Esa categoría ya existe" });
      const category = {
        id: crypto.randomUUID(),
        name,
        position: categories.length + 1,
        active: true,
      };
      categories.push(category);
      write("categories", categories);
      return send(res, 201, category);
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (
    req.method === "PATCH" &&
    /^\/api\/admin\/categories\/[^/]+$/.test(req.url)
  ) {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede modificar categorías",
      });
    try {
      const input = await parseBody(req);
      const id = decodeURIComponent(req.url.split("/").pop());
      const categories = read("categories");
      const category = categories.find((item) => String(item.id) === id);
      if (!category)
        return send(res, 404, { error: "Categoría no encontrada" });
      if (input.name !== undefined) {
        const name = String(input.name).trim().slice(0, 80);
        if (!name)
          return send(res, 400, { error: "Falta el nombre de la categoría" });
        if (
          categories.some(
            (item) =>
              item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
          )
        )
          return send(res, 409, { error: "Esa categoría ya existe" });
        category.name = name;
      }
      if (typeof input.active === "boolean") category.active = input.active;
      write("categories", categories);
      return send(res, 200, category);
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (
    req.method === "DELETE" &&
    /^\/api\/admin\/categories\/[^/]+$/.test(req.url)
  ) {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede eliminar categorías",
      });
    const id = decodeURIComponent(req.url.split("/").pop());
    const categories = read("categories");
    if (!categories.some((category) => String(category.id) === id))
      return send(res, 404, { error: "Categoría no encontrada" });
    write(
      "categories",
      categories
        .filter((category) => String(category.id) !== id)
        .map((category, index) => ({ ...category, position: index + 1 })),
    );
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && req.url === "/api/admin/users") {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede crear cuentas",
      });
    try {
      const input = await parseBody(req);
      const username = String(input.username || "")
        .toLowerCase()
        .trim();
      const password = String(input.password || "");
      if (!/^[a-z0-9_-]{3,24}$/.test(username))
        return send(res, 400, {
          error: "El usuario debe tener entre 3 y 24 caracteres",
        });
      if (password.length < 8)
        return send(res, 400, {
          error: "La contraseña debe tener al menos 8 caracteres",
        });
      if (!["admin", "guest"].includes(input.role))
        return send(res, 400, { error: "Rol inválido" });
      const users = read("users");
      if (users.some((user) => user.username === username))
        return send(res, 409, { error: "Ese usuario ya existe" });
      const user = {
        username,
        role: input.role,
        active: input.active !== false,
        passwordHash: passwordHash(password),
      };
      users.push(user);
      write("users", users);
      return send(res, 201, {
        username: user.username,
        role: user.role,
        active: user.active,
      });
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "PATCH" && /^\/api\/admin\/users\/[^/]+$/.test(req.url)) {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede modificar cuentas",
      });
    try {
      const input = await parseBody(req),
        username = decodeURIComponent(req.url.split("/").pop()),
        users = read("users"),
        user = users.find((item) => item.username === username);
      if (!user) return send(res, 404, { error: "Cuenta no encontrada" });
      if (username === session.username && input.active === false)
        return send(res, 400, {
          error: "No puedes desactivar tu propia cuenta",
        });
      const nextUsername = String(input.username ?? username)
        .toLowerCase()
        .trim();
      if (!/^[a-z0-9_-]{3,24}$/.test(nextUsername))
        return send(res, 400, {
          error: "El usuario debe tener entre 3 y 24 caracteres",
        });
      if (
        nextUsername !== username &&
        users.some((item) => item.username === nextUsername)
      )
        return send(res, 409, { error: "Ese usuario ya existe" });
      if (input.password !== undefined && String(input.password).length > 0) {
        if (String(input.password).length < 8)
          return send(res, 400, {
            error: "La contraseña debe tener al menos 8 caracteres",
          });
        user.passwordHash = passwordHash(String(input.password));
      }
      if (username === session.username && input.role === "guest")
        return send(res, 400, {
          error: "No puedes quitarte tus propios permisos de administrador",
        });
      if (typeof input.active === "boolean") user.active = input.active;
      if (["admin", "guest"].includes(input.role)) user.role = input.role;
      user.username = nextUsername;
      if (username === session.username) session.username = nextUsername;
      write("users", users);
      return send(res, 200, {
        username: user.username,
        role: user.role,
        active: user.active !== false,
      });
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "DELETE" && /^\/api\/admin\/users\/[^/]+$/.test(req.url)) {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede eliminar cuentas",
      });
    const username = decodeURIComponent(req.url.split("/").pop());
    if (username === session.username)
      return send(res, 400, {
        error: "No puedes eliminar la cuenta con la que has iniciado sesión",
      });
    const users = read("users");
    if (!users.some((user) => user.username === username))
      return send(res, 404, { error: "Cuenta no encontrada" });
    write(
      "users",
      users.filter((user) => user.username !== username),
    );
    for (const [token, savedSession] of sessions)
      if (savedSession.username === username) sessions.delete(token);
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && /^\/api\/clips\/[^/]+\/review$/.test(req.url)) {
    const session = sessionFor(req);
    if (session?.role !== "admin")
      return send(res, 403, {
        error: "Solo el administrador puede revisar clips",
      });
    try {
      const input = await parseBody(req),
        id = req.url.split("/")[3],
        clips = read("clips"),
        clip = clips.find((item) => item.id === id);
      if (!clip || !["approved", "rejected"].includes(input.status))
        return send(res, 400, { error: "Revisión inválida" });
      clip.status = input.status;
      clip.reviewedAt = new Date().toISOString();
      write("clips", clips);
      return send(res, 200, clip);
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "POST" && req.url === "/api/vote") {
    try {
      const input = await parseBody(req);
      const votes = read("votes");
      if (
        votes.some(
          (vote) =>
            vote.browserId === input.browserId &&
            vote.category === input.category,
        )
      )
        return send(res, 409, { error: "Ya has votado en esta categoría" });
      votes.push({
        browserId: String(input.browserId),
        category: String(input.category),
        participantId: String(input.participantId),
        createdAt: new Date().toISOString(),
      });
      write("votes", votes);
      return send(res, 201, { ok: true });
    } catch {
      return send(res, 400, { error: "Datos inválidos" });
    }
  }
  if (req.method === "GET" && req.url.startsWith("/uploads/profiles/")) {
    const requested = decodeURIComponent(req.url).replace(/^\//, "");
    const target = path.resolve(root, requested);
    if (
      !target.startsWith(profilesDir) ||
      !fs.existsSync(target) ||
      fs.statSync(target).isDirectory()
    ) {
      res.writeHead(404);
      return res.end("No encontrado");
    }
    const mime = {
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    res.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
    });
    return fs.createReadStream(target).pipe(res);
  }
  const requested =
    req.url === "/"
      ? "index.html"
      : decodeURIComponent(req.url).replace(/^\//, "");
  const target = path.resolve(staticRoot, requested);
  if (
    !target.startsWith(staticRoot) ||
    !fs.existsSync(target) ||
    fs.statSync(target).isDirectory()
  ) {
    res.writeHead(404);
    return res.end("No encontrado");
  }
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
  };
  res.writeHead(200, {
    "Content-Type": mime[path.extname(target)] || "application/octet-stream",
  });
  fs.createReadStream(target).pipe(res);
});

function start(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") return start(port + 1);
    throw error;
  });
  server.listen(port, () =>
    console.log(`SAAAPEE AWARDS en http://localhost:${port}`),
  );
}
start(3000);
