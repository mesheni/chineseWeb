// Safe error handler - hides internal details in production
function safeError(res, error, defaultMsg = 'Внутренняя ошибка сервера') {
  console.error(error);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : error.message;
  res.status(500).json({ error: msg });
}

module.exports = { safeError };