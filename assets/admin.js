
(() => {
  const $ = s => document.querySelector(s);
  const cfg = window.KAVITH_CONFIG || {};

  const configured =
    window.supabase &&
    cfg.supabaseUrl &&
    !cfg.supabaseUrl.startsWith("YOUR_") &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseAnonKey.startsWith("YOUR_");

  const status = $("#connectionStatus");
  let db = null;
  let user = null;

  const PROJECT_BUCKET = "site-media";

  if (configured) {
    db = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey
    );
    status.textContent = "SUPABASE CONNECTED";
  } else {
    status.textContent = "SETUP REQUIRED — CHECK CONFIG";
  }

  // NAVIGATION
  document.querySelectorAll(".admin-nav button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav button")
        .forEach(x => x.classList.remove("active"));

      b.classList.add("active");

      document.querySelectorAll(".dash-tab")
        .forEach(x => x.classList.remove("active"));

      const tab = $("#tab-" + b.dataset.tab);
      if (tab) tab.classList.add("active");
    });
  });

  // LOGIN
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!db) {
      $("#loginMessage").textContent = "Connect Supabase first.";
      return;
    }

    const { data, error } = await db.auth.signInWithPassword({
      email: $("#loginEmail").value,
      password: $("#loginPassword").value
    });

    if (error) {
      $("#loginMessage").textContent = error.message;
      return;
    }

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
    await Promise.all([
      loadProjects(),
      loadMedia(),
      loadGallery(),
      loadSettings(),
      loadLogo()
    ]);
  }

  // PROJECTS
  async function loadProjects() {
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      $("#projectsList").innerHTML =
        `<p class="muted">Could not load projects: ${esc(error.message)}</p>`;
      return;
    }

    $("#projectCount").textContent = data.length;

    $("#projectsList").innerHTML = data.map(p => `
      <div class="manage-row">
        <div>
          <b>${esc(p.title)}</b>
          <small>${esc(p.category || "Project")} · ${esc(p.status || "")}</small>
          ${p.image_url
            ? `<small><a href="${esc(p.image_url)}" target="_blank" rel="noopener">View project photo</a></small>`
            : ""}
        </div>
        <div>
          <button data-edit="${p.id}" class="mini-btn">EDIT</button>
          <button data-delete="${p.id}" class="mini-btn danger">DELETE</button>
        </div>
      </div>
    `).join("") || "<p class='muted'>No projects yet.</p>";

    $("#projectsList").querySelectorAll("[data-edit]").forEach(b => {
      b.onclick = () => editProject(
        data.find(p => String(p.id) === b.dataset.edit)
      );
    });

    $("#projectsList").querySelectorAll("[data-delete]").forEach(b => {
      b.onclick = () => deleteProject(b.dataset.delete);
    });
  }

  function editProject(p) {
    if (!p) return;

    $("#projectId").value = p.id;
    $("#projectTitle").value = p.title || "";
    $("#projectCategory").value = p.category || "";
    $("#projectStatus").value = p.status || "Completed";
    $("#projectImage").value = p.image_url || "";
    $("#projectFile").value = "";

    $("#projectImageNote").textContent = p.image_url
      ? "A photo is already saved. Choose another photo only if you want to replace it."
      : "Choose a photo from your computer. The image will upload when you save the project.";

    $("#projectDescription").value = p.description || "";

    document.querySelector('[data-tab="projects"]').click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadProjectPhoto(file) {
    if (!file) return $("#projectImage").value || "";

    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Please choose an image smaller than 20 MB.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `projects/${Date.now()}-${safeName}`;

    const { error: uploadError } = await db.storage
      .from(PROJECT_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = db.storage
      .from(PROJECT_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  $("#projectForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!db) {
      alert("Supabase is not connected.");
      return;
    }

    const submitButton =
      e.submitter || $("#projectForm button[type='submit']");

    const oldText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "SAVING…";

    try {
      const imageUrl = await uploadProjectPhoto(
        $("#projectFile").files[0]
      );

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

      $("#projectImageNote").textContent =
        "Choose a photo from your computer. The image will upload when you save the project.";

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

    $("#projectImageNote").textContent =
      "Choose a photo from your computer. The image will upload when you save the project.";
  };

  async function deleteProject(id) {
    if (!confirm("Delete this project?")) return;

    const { error } = await db
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) alert(error.message);
    else loadProjects();
  }

  // EXISTING MEDIA GALLERY - UNCHANGED
  async function loadMedia() {
    const { data, error } = await db
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      $("#mediaList").innerHTML =
        `<p class="muted">${esc(error.message)}</p>`;
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
          <button class="mini-btn danger"
            data-media-delete="${m.id}"
            data-path="${esc(m.storage_path)}">DELETE</button>
        </div>
      </div>
    `).join("") || "<p class='muted'>No media uploaded yet.</p>";

    $("#mediaList").querySelectorAll("[data-media-delete]").forEach(b => {
      b.onclick = () => deleteMedia(
        b.dataset.mediaDelete,
        b.dataset.path
      );
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

    const submitButton =
      e.submitter || $("#mediaForm button[type='submit']");

    const oldText = submitButton ? submitButton.textContent : "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "UPLOADING…";
    }

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `gallery/${Date.now()}-${safeName}`;

    try {
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

    const { error } = await db
      .from("media")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await loadMedia();
    }
  }

  // NEW SEPARATE WEBSITE GALLERY
  async function loadGallery() {
    const list = $("#websiteGalleryList");
    if (!list) return;

    const { data, error } = await db
      .from("gallery_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      list.innerHTML =
        `<p class="muted">Could not load Gallery photos: ${esc(error.message)}</p>`;
      return;
    }

    list.innerHTML = data.map(photo => `
      <div class="manage-row">
        <div style="display:flex;align-items:center;gap:12px;">
          <img
            src="${esc(photo.public_url)}"
            alt="Gallery photo"
            style="width:75px;height:65px;object-fit:cover;border-radius:5px;">
          <div>
            <b>${esc(photo.caption || "Gallery Photo")}</b>
            <small>${esc(photo.file_name || "")}</small>
          </div>
        </div>
        <div>
          <a class="mini-btn"
             href="${esc(photo.public_url)}"
             target="_blank"
             rel="noopener">VIEW</a>
          <button
            class="mini-btn danger"
            data-gallery-delete="${esc(photo.id)}"
            data-gallery-path="${esc(photo.storage_path)}">
            DELETE
          </button>
        </div>
      </div>
    `).join("") || "<p class='muted'>No Gallery photos uploaded yet.</p>";

    list.querySelectorAll("[data-gallery-delete]").forEach(button => {
      button.onclick = () => deleteGalleryPhoto(
        button.dataset.galleryDelete,
        button.dataset.galleryPath
      );
    });
  }

  // UPLOAD GALLERY PHOTO
  $("#galleryUploadForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!db) {
      alert("Supabase is not connected.");
      return;
    }

    const file = $("#galleryPhotoFile").files[0];

    if (!file) {
      $("#galleryUploadMessage").textContent =
        "Please choose a photo.";
      return;
    }

    if (!file.type.startsWith("image/")) {
      $("#galleryUploadMessage").textContent =
        "Please choose an image file.";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      $("#galleryUploadMessage").textContent =
        "Please choose a photo smaller than 20 MB.";
      return;
    }

    const button = $("#galleryUploadBtn");
    const oldText = button.textContent;

    button.disabled = true;
    button.textContent = "UPLOADING…";
    $("#galleryUploadMessage").textContent =
      "Uploading your photo. Please wait…";

    let uploadedPath = "";

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");

      // Separate folder for the new Gallery only.
      uploadedPath =
        `website-gallery/${Date.now()}-${safeName}`;

      const { error: uploadError } = await db.storage
        .from(PROJECT_BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage
        .from(PROJECT_BUCKET)
        .getPublicUrl(uploadedPath);

      const row = {
        caption: $("#galleryPhotoCaption").value.trim(),
        category: "construction",
        file_name: file.name,
        storage_path: uploadedPath,
        public_url: urlData.publicUrl
      };

      const { error: insertError } = await db
        .from("gallery_photos")
        .insert(row);

      if (insertError) throw insertError;

      e.target.reset();

      $("#galleryUploadMessage").textContent =
        "Photo uploaded successfully!";

      await loadGallery();

    } catch (error) {
      if (uploadedPath) {
        await db.storage
          .from(PROJECT_BUCKET)
          .remove([uploadedPath]);
      }

      $("#galleryUploadMessage").textContent =
        "Gallery upload failed: " +
        (error.message || String(error));

    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  });

  // DELETE GALLERY PHOTO
  async function deleteGalleryPhoto(id, path) {
    if (!confirm("Delete this Gallery photo?")) return;

    const { error: deleteError } = await db
      .from("gallery_photos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      alert("Could not delete photo: " + deleteError.message);
      return;
    }

    const { error: storageError } = await db.storage
      .from(PROJECT_BUCKET)
      .remove([path]);

    if (storageError) {
      alert(
        "Photo record deleted, but the storage file could not be removed: " +
        storageError.message
      );
    }

    await loadGallery();
  }

  // WEBSITE SETTINGS
  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return;

    $("#settingPhone").value = data.phone || "";
    $("#settingEmail").value = data.email || "";
    $("#settingLocation").value = data.location || "";
  }

  $("#settingsForm").addEventListener("submit", async e => {
    e.preventDefault();

    const row = {
      id: 1,
      phone: $("#settingPhone").value,
      email: $("#settingEmail").value,
      location: $("#settingLocation").value
    };

    const { error } = await db
      .from("site_settings")
      .upsert(row);

    $("#settingsMessage").textContent = error
      ? error.message
      : "Settings saved successfully.";
  });

  // LOGO MANAGER
  async function loadLogo() {
    const { data, error } = await db
      .from("site_settings")
      .select("logo_url")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      $("#logoStatus").textContent = error.message;
      return;
    }

    if (data && data.logo_url) {
      showLogoPreview(data.logo_url);
      $("#logoStatus").textContent = "Your saved company logo.";
    } else {
      $("#logoStatus").textContent = "No custom logo loaded yet.";
    }
  }

  function showLogoPreview(url) {
    $("#logoPreview").src = url;
    $("#logoPreview").style.display = "block";
    $("#logoPlaceholder").style.display = "none";
  }

  $("#logoFile").addEventListener("change", () => {
    const file = $("#logoFile").files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    showLogoPreview(localUrl);
    $("#logoStatus").textContent = "Preview of the selected logo. Save to publish it.";
  });

  $("#logoForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!db) {
      alert("Supabase is not connected.");
      return;
    }

    const file = $("#logoFile").files[0];

    if (!file) {
      $("#logoMessage").textContent = "Please choose a logo file.";
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "svg"];

    if (!allowed.includes(extension)) {
      $("#logoMessage").textContent =
        "Please choose a PNG, JPG, JPEG or SVG file.";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      $("#logoMessage").textContent =
        "Please choose a logo smaller than 10 MB.";
      return;
    }

    const submitButton = $("#saveLogoBtn");
    const oldText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "UPLOADING…";
    $("#logoMessage").textContent = "Uploading your logo. Please wait…";

    let uploadedPath = "";

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      uploadedPath = `branding/logo-${Date.now()}-${safeName}`;

      const contentType = extension === "svg"
        ? "image/svg+xml"
        : file.type || (extension === "png" ? "image/png" : "image/jpeg");

      const { error: uploadError } = await db.storage
        .from(PROJECT_BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage
        .from(PROJECT_BUCKET)
        .getPublicUrl(uploadedPath);

      const logoUrl = urlData.publicUrl;

      const { data: existing, error: readError } = await db
        .from("site_settings")
        .select("id")
        .eq("id", 1)
        .maybeSingle();

      if (readError) throw readError;

      let saveResult;

      if (existing) {
        saveResult = await db
          .from("site_settings")
          .update({ logo_url: logoUrl })
          .eq("id", 1);
      } else {
        saveResult = await db
          .from("site_settings")
          .insert({ id: 1, logo_url: logoUrl });
      }

      if (saveResult.error) throw saveResult.error;

      showLogoPreview(logoUrl);
      $("#logoStatus").textContent = "Your company logo is saved.";
      $("#logoMessage").textContent =
        "Logo uploaded and saved successfully!";

      $("#logoFile").value = "";

    } catch (error) {
      if (uploadedPath) {
        await db.storage
          .from(PROJECT_BUCKET)
          .remove([uploadedPath]);
      }

      $("#logoMessage").textContent =
        "Logo upload failed: " + (error.message || String(error));

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = oldText;
    }
  });

  // RESTORE EXISTING SESSION
  if (configured) {
    db.auth.getSession().then(({ data }) => {
      if (data.session) {
        user = data.session.user;
        showDashboard();
      }
    });
  }

  // HTML ESCAPING
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
