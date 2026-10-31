# CustomForge working rules

- Make all changes in `CustomForge-mongodb`.
- `C:\Users\Home\Desktop\Projects\CustomForge-supabase` is a strictly read-only reference. Never edit, format, install dependencies, run builds, or generate files there.
- Use the latest reference storefront and admin experience while retaining MongoDB as this application's database.
- Preserve existing database records and local secrets. Tests and demo seeding must use an isolated local database; never reset or seed the configured application database implicitly.
- Validate the storefront, admin, API, and core commerce flows before describing the application as complete.
