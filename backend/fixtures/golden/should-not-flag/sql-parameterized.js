try {
  db.query('SELECT * FROM users WHERE id = ?', [userId]);
} catch (error) {
  handleQueryError(error);
}
