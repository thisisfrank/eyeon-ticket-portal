import { route } from './_lib/http.js';
import { clearSession } from './_lib/session.js';

export default route({
  async POST(_req, res) {
    clearSession(res);
    return { ok: true };
  },
});
