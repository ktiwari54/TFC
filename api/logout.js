module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'tfc_cms_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};
