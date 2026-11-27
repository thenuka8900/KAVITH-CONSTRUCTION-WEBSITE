
(() => {
  const $ = s => document.querySelector(s);

  $("#year").textContent = new Date().getFullYear();

  $("#menuToggle").addEventListener("click", () => {
    $("#mainNav").classList.toggle("open");
  });

  document.querySelectorAll("#mainNav a").forEach(a => {
    a.addEventListener("click", () => {
      $("#mainNav").classList.remove("open");
    });
  });

  const cfg = window.KAVITH_CONFIG || {};

  const connected =
    window.supabase &&
    cfg.supabaseUrl &&
    !cfg.supabaseUrl.startsWith("YOUR_") &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseAnonKey.startsWith("YOUR_");

  if (connected) {
    const db = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey
    );

    // WEBSITE SETTINGS AND COMPANY LOGO
    db.from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;

        if (data.phone) {
          $("#phoneText").textContent = data.phone;
        }

        if (data.email) {
          $("#emailText").textContent = data.email;
        }

        if (data.location) {
          $("#locationText").textContent = data.location;
        }

        // Automatically update Header and Footer logos
        if (data.logo_url) {
          document.querySelectorAll(".brand-mark").forEach(mark => {
            const logo = document.createElement("img");

            logo.src = data.logo_url;
            logo.alt = "KAVITH CONSTRUCTION Logo";
            logo.style.width = "100%";
            logo.style.height = "100%";
            logo.style.objectFit = "contain";
            logo.style.display = "block";

            mark.textContent = "";
            mark.appendChild(logo);
          });
        }
      });

    // PROJECTS
    db.from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length) {
          $("#projectGrid").innerHTML = data.map(p => `
            <article class="project-card">
              ${p.image_url
                ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}">`
                : ""}
              <div>
                <span>${esc(p.category || p.status || "PROJECT")}</span>
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.description || "")}</p>
              </div>
            </article>
          `).join("");
        }
      });

    // MEDIA GALLERY
    db.from("media")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length) {
          $("#galleryGrid").innerHTML = data.map(m =>
            m.media_type === "video"
              ? `<video controls src="${esc(m.public_url)}"></video>`
              : `<img src="${esc(m.public_url)}" alt="${esc(m.caption || "Project image")}">`
          ).join("");
        }
      });
  }

  // CONTACT FORM
  $("#contactForm").addEventListener("submit", e => {
    e.preventDefault();

    const d = new FormData(e.currentTarget);

    const subject = encodeURIComponent(
      "Website enquiry — KAVITH CONSTRUCTION"
    );

    const body = encodeURIComponent(
      `Name: ${d.get("name")}\nContact: ${d.get("contact")}\n\nProject:\n${d.get("message")}`
    );

    if (cfg.contactEmail && !cfg.contactEmail.includes("example.com")) {
      location.href =
        `mailto:${cfg.contactEmail}?subject=${subject}&body=${body}`;
    } else {
      $("#formNote").textContent =
        "Please configure the company email in assets/config.js. Your enquiry details are ready in the form.";
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
