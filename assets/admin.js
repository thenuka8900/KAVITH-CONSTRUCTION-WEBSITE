
(() => {
  const $ = s => document.querySelector(s);
  const cfg = window.KAVITH_CONFIG || {};
  const configured = window.supabase && cfg.supabaseUrl && !cfg.supabaseUrl.startsWith("YOUR_") && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("YOUR_");
  const status = $("#connectionStatus");
  let db = null, user = null;

  // Use the existing Supabase Storage bucket.
  const PROJECT_BUCKET = "site-media";

  if (configured) {
    db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    status.textContent = "SUPABASE CONNECTED";
  } else {
    status.textContent = "SETUP REQUIRED — CHECK CONFIG";
  }

  document.querySelectorAll(".admin-nav button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".admin-nav button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".dash-tab").forEach(x => x.classList.remove("active"));
    $("#tab-" + b.dataset.tab).classList.add("active");
  }));

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!db) { $("#loginMessage").textContent = "Connect Supabase first."; return; }
    const { data, error } = await db.auth.signInWithPassword({
      email: $("#loginEmail").value,
      password: $("#loginPassword").value
    });
    if (error) { $("#loginMessage").textContent = error.message; return; }
    user = data.user;
    showDashboard();
  });

  $("#logoutBtn").addEventListener("click", async () => {
    if (db) await db.auth.signOut();
    location.reload();
  });

  function showDashboard() {
    $("#loginPanel").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    $("#logoutBtn").classList.remove("hidden");
    loadAll();
  }

  async function loadAll() {
    await Promise.all([loadProjects(), loadMedia(), loadSettings()]);
  }

  async function loadProjects() {
    const { data, error } = await db.from("projects").select("*").order("created_at", { ascending: false });
    if (error) {
      $("#projectsList").innerHTML = `<p class="muted">Could not load projects: ${esc(error.message)}</p>`;
      return;
    }
    $("#projectCount").textContent = data.length;
    $("#projectsList").innerHTML = data.map(p => `
      <div class="manage-row">
        <div>
          <b>${esc(p.title)}</b>
          <small>${esc(p.category || "Project")} · ${esc(p.status || "")}</small>
          ${p.image_url ? `<small><a href="${esc(p.image_url)}" target="_blank" rel="noopener">View project photo</a></small>` : ""}
        </div>
        <div><button data-edit="${p.id}" class="mini-btn">EDIT</button><button data-delete="${p.id}" class="mini-btn danger">DELETE</button></div>
      </div>`).join("") || "<p class='muted'>No projects yet.</p>";

    $("#projectsList").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editProject(data.find(p => p.id === b.dataset.edit)));
    $("#projectsList").querySelectorAll("[data-delete]").forEach(b => b.onclick = () => deleteProject(b.dataset.delete));
  }

  function editProject(p) {
    $("#projectId").value = p.id;
    $("#projectTitle").value = p.title || "";
    $("#projectCategory").value = p.category || "";
    $("#projectStatus").value = p.status || "Completed";
    $("#projectImage").value = p.image_url || "";
    $("#projectFile").value = "";
    $("#projectImageNote").textContent = p.image_url ? "A photo is already saved. Choose another photo only if you want to replace it." : "Choose a photo from your computer. The image will upload when you save the project.";
    $("#projectDescription").value = p.description || "";
    document.querySelector('[data-tab="projects"]').click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadProjectPhoto(file) {
    if (!file) return $("#projectImage").value || "";
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Please choose an image smaller than 20 MB.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `projects/${Date.now()}-${safeName}`;
    const { error: uploadError } = await db.storage.from(PROJECT_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (uploadError) throw uploadError;

    const { data } = db.storage.from(PROJECT_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  $("#projectForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!db) { alert("Supabase is not connected."); return; }

    const submitButton = e.submitter || $("#projectForm button[type='submit']");
    const oldText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "SAVING…";

    try {
      const imageUrl = await uploadProjectPhoto($("#projectFile").files[0]);
      const id = $("#projectId").value;
      const row = {
        title: $("#projectTitle").value.trim(),
        category: $("#projectCategory").value.trim(),
        status: $("#projectStatus").value,
        image_url: imageUrl,
        description: $("#projectDescription").value.trim()
      };

      const result = id
        ? await db.from("projects").update(row).eq("id", id)
        : await db.from("projects").insert(row);

      if (result.error) throw result.error;

      e.target.reset();
      $("#projectId").value = "";
      $("#projectImage").value = "";
      $("#projectImageNote").textContent = "Choose a photo from your computer. The image will upload when you save the project.";
      await loadProjects();
      alert("Project saved successfully.");
    } catch (error) {
      alert("Project was not saved: " + (error.message || String(error)));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = oldText;
    }
  });

  $("#clearProject").onclick = () => {
    $("#projectForm").reset();
    $("#projectId").value = "";
    $("#projectImage").value = "";
    $("#projectImageNote").textContent = "Choose a photo from your computer. The image will upload when you save the project.";
  };

  async function deleteProject(id) {
    if (!confirm("Delete this project?")) return;
    const { error } = await db.from("projects").delete().eq("id", id);
    if (error) alert(error.message);
    else loadProjects();
  }

  // MEDIA GALLERY
  // Uses the same existing site-media bucket as Project Photos.

  async function loadMedia() {
    const { data, error } = await db.from("media").select("*").order("created_at", { ascending: false });
    if (error) {
      $("#mediaList").innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      return;
    }

    $("#mediaCount").textContent = data.length;
    $("#mediaList").innerHTML = data.map(m => `
      <div class="manage-row">
        <div>
          <b>${esc(m.caption || "Untitled media")}</b>
          <small>${esc(m.media_type)} · ${esc(m.file_name || "")}</small>
        </div>
        <div>
          <a class="mini-btn" href="${esc(m.public_url)}" target="_blank" rel="noopener">VIEW</a>
          <button class="mini-btn danger" data-media-delete="${m.id}" data-path="${esc(m.storage_path)}">DELETE</button>
        </div>
      </div>`).join("") || "<p class='muted'>No media uploaded yet.</p>";

    $("#mediaList").querySelectorAll("[data-media-delete]").forEach(b => {
      b.onclick = () => deleteMedia(b.dataset.mediaDelete, b.dataset.path);
    });
  }

  $("#mediaForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!db) {
      alert("Supabase is not connected.");
      return;
    }

    const f = $("#mediaFile").files[0];
    if (!f) {
      alert("Please choose a photo or video.");
      return;
    }

    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      alert("Please choose an image or video file.");
      return;
    }

    if (f.size > 100 * 1024 * 1024) {
      alert("Please keep uploads under 100 MB.");
      return;
    }

    const submitButton = e.submitter || $("#mediaForm button[type='submit']");
    const oldText = submitButton ? submitButton.textContent : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "UPLOADING…";
    }

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `gallery/${Date.now()}-${safeName}`;

    try {
      // Upload to the existing site-media bucket.
      const { error: upErr } = await db.storage
        .from(PROJECT_BUCKET)
        .upload(path, f, {
          upsert: false,
          cacheControl: "3600",
          contentType: f.type
        });

      if (upErr) throw upErr;

      const { data: urlData } = db.storage
        .from(PROJECT_BUCKET)
        .getPublicUrl(path);

      const row = {
        caption: $("#mediaCaption").value.trim(),
        media_type: f.type.startsWith("video/") ? "video" : "photo",
        file_name: f.name,
        storage_path: path,
        public_url: urlData.publicUrl
      };

      const { error } = await db.from("media").insert(row);

      if (error) {
        await db.storage.from(PROJECT_BUCKET).remove([path]);
        throw error;
      }

      e.target.reset();
      await loadMedia();
      alert("Media uploaded successfully!");
    } catch (error) {
      alert("Media upload failed: " + (error.message || String(error)));
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = oldText;
      }
    }
  });

  async function deleteMedia(id, path) {
    if (!confirm("Delete this media item?")) return;

    const { error: storageErr } = await db.storage
      .from(PROJECT_BUCKET)
      .remove([path]);

    if (storageErr) {
      alert(storageErr.message);
      return;
    }

    const { error } = await db.from("media").delete().eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await loadMedia();
    }
  }

  // WEBSITE SETTINGS

  async function loadSettings() {
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) return;

    if (data) {
      $("#settingPhone").value = data.phone || "";
      $("#settingEmail").value = data.email || "";
      $("#settingLocation").value = data.location || "";
    }
  }

  $("#settingsForm").addEventListener("submit", async e => {
    e.preventDefault();

    const row = {
      id: 1,
      phone: $("#settingPhone").value,
      email: $("#settingEmail").value,
      location: $("#settingLocation").value
    };

    const { error } = await db.from("site_settings").upsert(row);
    $("#settingsMessage").textContent = error ? error.message : "Settings saved successfully.";
  });

  if (configured) db.auth.getSession().then(({ data }) => {
    if (data.session) {
      user = data.session.user;
      showDashboard();
    }
  });

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }
})();
