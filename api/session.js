const { getSession } = require('./lib/auth');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ authed: !!getSession(req) }));
};