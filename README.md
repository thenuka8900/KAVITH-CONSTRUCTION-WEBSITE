# KAVITH CONSTRUCTION — Website + Admin Panel

A responsive black-and-gold construction company website with a Supabase-powered admin panel.

## Included
- Public website: `index.html`
- Admin panel: `admin.html`
- Project add/edit/delete
- Photo and video upload to Supabase Storage
- Website contact settings
- Supabase Auth login
- GitHub Pages deployment workflow

## Important before launch
This project needs a Supabase project for secure admin login, shared content and media storage. GitHub Pages is static hosting and cannot securely store admin passwords or uploaded files by itself.

## 1. Create Supabase backend
1. Create a free project at https://supabase.com
2. Open **SQL Editor** in your Supabase project.
3. Paste and run the contents of `supabase/schema.sql`.
4. Go to **Project Settings → API** and copy the Project URL and `anon` / publishable key.
5. Open `assets/config.js` and replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_KEY`
6. Do not put a `service_role` key in browser code.

## 2. Create your admin login
1. In Supabase, open **Authentication → Users**.
2. Add a new user with your own email and a strong password.
3. Confirm the user if Supabase asks you to.
4. Open `admin.html` on your deployed site and sign in.

The SQL policies allow public visitors to read website content and signed-in users to manage content. For a production site with multiple user accounts, restrict write policies to a dedicated admin role or an explicit allow-list before inviting other users.

## 3. Preview on your computer
You can open `index.html` directly for a visual preview. Some browsers restrict scripts when opening files directly, so a local server is recommended:
- Install Node.js, then run `npx serve .`
- Open the local address shown in the terminal.

## 4. Publish with GitHub Pages
1. Create a GitHub account at https://github.com/signup
2. Create a new **public** repository, for example `kavith-construction`.
3. Upload all files and folders from this project to the repository root.
4. In GitHub, open **Settings → Pages**.
5. Under Build and deployment, select **GitHub Actions**.
6. The included workflow deploys the site when you push to the `main` branch.
7. Your site will appear at `https://YOUR-USERNAME.github.io/kavith-construction/`.

The app uses relative asset paths and supports deployment in a repository subfolder.

## 5. Customize before public launch
- Replace sample construction photos with your own project images.
- Update phone, email and location in the Admin Panel.
- Update the contact email in `assets/config.js`.
- Add real project descriptions and services.
- Add your company logo when available.

## Notes
- Sample photos are remote Unsplash images used as temporary visual placeholders.
- Contact form currently opens the visitor's email app (mailto). It does not store enquiries in a database.
- Large videos can use substantial storage and bandwidth. Consider optimized MP4/WebM files and a suitable storage plan.
- The initial website copy is placeholder marketing text. Verify all company claims and contact details before publishing.
