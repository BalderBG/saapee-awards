// Adaptador local: conserva la interfaz de la pantalla sin usar Supabase.
const browserId = localStorage.getItem("saapee-browser") || crypto.randomUUID();
localStorage.setItem("saapee-browser", browserId);

const data = () => fetch("/api/data").then((response) => response.json());
const recordsFor = async (table) => {
  const local = await data();
  if (table === "clips")
    return local.clips
      .filter((clip) => clip.status === "approved")
      .map((clip) => ({
        id: clip.id,
        title: clip.title,
        author_name: clip.author,
        youtube_id: clip.youtubeId,
        status: clip.status,
      }));
  if (table === "categories")
    return (local.categories || []).sort((a, b) => a.position - b.position);
  return [];
};
const query = (table) => ({
  select: () => ({
    eq: () => ({
      order: () => ({
        then: async (fn) => fn({ data: await recordsFor(table) }),
      }),
      maybeSingle: async () => ({ data: null }),
    }),
    order: () => ({
      then: async (fn) => fn({ data: await recordsFor(table) }),
    }),
  }),
});

export const supabase = {
  from: query,
  rpc: async (name, args) => {
    if (name === "submit_youtube_clip") {
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: args.clip_title,
          author: args.clip_author,
          youtubeUrl: args.clip_url,
        }),
      });
      const result = await response.json();
      return response.ok
        ? { data: result.id, error: null }
        : { data: null, error: { message: result.error } };
    }
    if (
      name === "get_nomination_ranking" ||
      name === "get_category_nominations"
    )
      return { data: [] };
    if (name === "cast_vote") {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserId,
          category: args.target_category || "local",
          participantId: args.target_nomination,
        }),
      });
      const result = await response.json();
      return response.ok
        ? { error: null }
        : { error: { message: result.error } };
    }
    return { data: null, error: null };
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: () => {},
};

export const isSupabaseReady = true;
