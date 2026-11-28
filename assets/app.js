
(() => {
  const $ = s => document.querySelector(s);

  // CURRENT YEAR
  if ($("#year")) {
    $("#year").textContent = new Date().getFullYear();
  }

  // MOBILE MENU
  if ($("#menuToggle") && $("#mainNav")) {
    $("#menuToggle").addEventListener("click", () => {
      $("#mainNav").classList.toggle("open");
    });

    document.querySelectorAll("#mainNav a").forEach(a => {
      a.addEventListener("click", () => {
        $("#mainNav").classList.remove("open");
      });
    });
  }

  const cfg = window.KAVITH_CONFIG || {};

  // COMPANY EMAIL
  const COMPANY_EMAIL = "kavithconstruction1@gmail.com";

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

        if (data.phone && $("#phoneText")) {
          $("#phoneText").textContent = data.phone;
        }

        if (data.email && $("#emailText")) {
          $("#emailText").textContent = data.email;
        }

        if (data.location && $("#locationText")) {
          $("#locationText").textContent = data.location;
        }

        // AUTOMATIC HEADER AND FOOTER LOGO
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
      .then(({ data, error }) => {
        if (error) {
          console.error("Projects loading error:", error);
          return;
        }

        if (data && data.length && $("#projectGrid")) {
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

    // EXISTING MEDIA GALLERY
    db.from("media")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Media gallery loading error:", error);
          return;
        }

        if (data && data.length && $("#galleryGrid")) {
          $("#galleryGrid").innerHTML = data.map(m =>
            m.media_type === "video"
              ? `<video controls src="${esc(m.public_url)}"></video>`
              : `<img src="${esc(m.public_url)}" alt="${esc(m.caption || "Project image")}">`
          ).join("");
        }
      });
  }

  // CONTACT FORM - KAVITH CONSTRUCTION
  const contactForm = $("#contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", e => {
      e.preventDefault();

      const d = new FormData(contactForm);

      const name = String(d.get("name") || "").trim();
      const contact = String(d.get("contact") || "").trim();
      const message = String(d.get("message") || "").trim();

      if (!name || !contact || !message) {
        if ($("#formNote")) {
          $("#formNote").textContent =
            "Please fill in all required fields.";
        }
        return;
      }

      const subject = encodeURIComponent(
        "New Website Enquiry - KAVITH CONSTRUCTION"
      );

      const body = encodeURIComponent(
        `NEW WEBSITE ENQUIRY\n\n` +
        `Company: KAVITH CONSTRUCTION\n\n` +
        `Name: ${name}\n` +
        `Contact: ${contact}\n\n` +
        `Project Details:\n${message}\n\n` +
        `Sent from KAVITH CONSTRUCTION Website`
      );

      if ($("#formNote")) {
        $("#formNote").textContent =
          "Opening your email application. Please press Send to submit your enquiry.";
      }

      // OPEN EMAIL TO YOUR GMAIL ADDRESS
      window.location.href =
        `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;
    });
  }

  // SAFE HTML TEXT
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
