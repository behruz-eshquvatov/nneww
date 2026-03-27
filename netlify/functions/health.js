const jsonHeaders = {
  "Content-Type": "application/json",
};

export const handler = async () => ({
  statusCode: 200,
  headers: jsonHeaders,
  body: JSON.stringify({ ok: true }),
});
