/**
 * Seed Supabase with existing JSON content files.
 * Run once: node scripts/seed-db.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
);

const ROOT = path.join(__dirname, '..');

async function seedFilms() {
  const raw = fs.readFileSync(path.join(ROOT, 'content', 'films.json'), 'utf8');
  const { allFilms = [], assets } = JSON.parse(raw);

  console.log(`Seeding ${allFilms.length} films...`);
  for (let i = 0; i < allFilms.length; i++) {
    const f = allFilms[i];
    const { error } = await supabase.from('films').upsert({
      slug: f.slug,
      display_name: f.displayName || null,
      title: f.title || f.displayName || '',
      date: f.date || null,
      location: f.location || null,
      image: f.image || null,
      preview_video: f.previewVideo || null,
      categories: f.categories || [],
      sort_order: i,
    }, { onConflict: 'slug' });
    if (error) { console.error(`Film ${f.slug}:`, error.message); } else { console.log(`  ✓ ${f.slug}`); }
  }

  if (assets) {
    await supabase.from('homepage_content').upsert({ key: 'assets', data: assets }, { onConflict: 'key' });
    console.log('  ✓ assets');
  }
}

async function seedHomepage() {
  const raw = fs.readFileSync(path.join(ROOT, 'content', 'homepage.json'), 'utf8');
  const homepage = JSON.parse(raw);

  console.log('Seeding homepage sections...');
  for (const [key, value] of Object.entries(homepage)) {
    const { error } = await supabase
      .from('homepage_content')
      .upsert({ key, data: value }, { onConflict: 'key' });
    if (error) { console.error(`Section ${key}:`, error.message); } else { console.log(`  ✓ ${key}`); }
  }
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@tfc.com';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.log('Skipping admin user — ADMIN_PASSWORD not set');
    return;
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const { error } = await supabase
    .from('admin_users')
    .upsert({ email, password_hash: hash }, { onConflict: 'email' });
  if (error) { console.error('Admin user:', error.message); } else { console.log(`  ✓ admin user (${email})`); }
}

(async () => {
  try {
    await seedFilms();
    await seedHomepage();
    await seedAdminUser();
    console.log('\nDone! Database seeded successfully.');
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exit(1);
  }
})();
