const fs = require('fs');
const path = require('path');
const { supabase } = require('./db');

const ROOT = path.join(__dirname, '..', '..');
const ALLOWED = new Set(['homepage.json', 'films.json']);

// ---------- Films ----------

async function readFilms() {
  const { data, error } = await supabase
    .from('films')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);

  const allFilms = data.map(dbToFilm);
  const categories = buildCategories(allFilms);
  return { allFilms, categories, assets: await getAssets() };
}

async function writeFilms(payload) {
  const films = payload.allFilms || [];
  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    const row = filmToDb(film, i);
    const { error } = await supabase
      .from('films')
      .upsert(row, { onConflict: 'slug' });
    if (error) throw new Error(error.message);
  }
  // Remove films no longer in the list
  const slugs = films.map((f) => f.slug).filter(Boolean);
  if (slugs.length > 0) {
    await supabase.from('films').delete().not('slug', 'in', `(${slugs.map((s) => `"${s}"`).join(',')})`);
  }
}

function dbToFilm(row) {
  return {
    slug: row.slug,
    displayName: row.display_name,
    title: row.title,
    date: row.date,
    location: row.location,
    image: row.image,
    previewVideo: row.preview_video,
    categories: row.categories || [],
  };
}

function filmToDb(film, index) {
  return {
    slug: film.slug,
    display_name: film.displayName || null,
    title: film.title || film.displayName || '',
    date: film.date || null,
    location: film.location || null,
    image: film.image || null,
    preview_video: film.previewVideo || null,
    categories: film.categories || [],
    sort_order: index,
  };
}

function buildCategories(allFilms) {
  const cats = ['recents', 'favourites', 'classics', 'celebrities', 'international'];
  const result = {};
  cats.forEach((c) => { result[c] = []; });
  allFilms.forEach((film) => {
    (film.categories || []).forEach((cat) => {
      if (!result[cat]) result[cat] = [];
      result[cat].push({
        slug: film.slug,
        name: film.displayName || film.title,
        date: film.date,
        location: film.location,
        image: film.image,
        previewVideo: film.previewVideo,
      });
    });
  });
  return result;
}

// ---------- Homepage ----------

async function readHomepage() {
  const { data, error } = await supabase
    .from('homepage_content')
    .select('key, data');
  if (error) throw new Error(error.message);

  const result = {};
  (data || []).forEach(({ key, data: val }) => { result[key] = val; });
  return result;
}

async function writeHomepage(payload) {
  const keys = Object.keys(payload);
  for (const key of keys) {
    const { error } = await supabase
      .from('homepage_content')
      .upsert({ key, data: payload[key] }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
  }
}

// ---------- Assets (stored as homepage_content row) ----------

async function getAssets() {
  const { data } = await supabase
    .from('homepage_content')
    .select('data')
    .eq('key', 'assets')
    .single();
  return data?.data || {};
}

// ---------- Unified read/write (used by content API) ----------

async function readContent(name) {
  if (!ALLOWED.has(name)) throw new Error('Invalid content file');
  if (name === 'films.json') return readFilms();
  if (name === 'homepage.json') return readHomepage();
}

async function writeContent(name, data) {
  if (!ALLOWED.has(name)) throw new Error('Invalid content file');
  if (name === 'films.json') return writeFilms(data);
  if (name === 'homepage.json') return writeHomepage(data);
}

// ---------- File uploads — Supabase Storage ----------

async function saveUpload(folder, filename, buffer) {
  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = `${folder}/${safeName}`;
  const ext = safeName.split('.').pop().toLowerCase();
  const mime = ext === 'mp4' ? 'video/mp4'
    : ext === 'webm' ? 'video/webm'
    : ext === 'mov' ? 'video/quicktime'
    : ext === 'png' ? 'image/png'
    : ext === 'gif' ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';

  const { error } = await supabase.storage
    .from('uploads')
    .upload(storagePath, buffer, { contentType: mime, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return data.publicUrl;
}

module.exports = { readContent, writeContent, saveUpload, ALLOWED };
