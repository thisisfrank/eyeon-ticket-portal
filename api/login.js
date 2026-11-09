import { HttpError, readBody, route } from './_lib/http.js';
import { features, isAllowedClient, passwordMatches, passwordVersion, publicUser, setSession } from './_lib/session.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pause = () => new Promise((done) => setTimeout(done, 700));

export default route({
  async POST(req, res) {
    const { role, email, password } = readBody(req);

    if (role === 'developer') {
      if (!process.env.DEV_PASSWORD) throw new HttpError(500, 'DEV_PASSWORD is not set on the server.');
      if (!passwordMatches(password || '')) {
        await pause();
        throw new HttpError(401, 'That password isn’t right.');
      }
      const user = { role: 'developer', name: process.env.TEAM_NAME || 'Team', pv: passwordVersion() };
      setSession(res, user);
      return { user: publicUser(user), features: features(user) };
    }

    const normalized = String(email || '').trim().toLowerCase();
    if (!EMAIL.test(normalized)) throw new HttpError(400, 'Enter a valid email address.');
    if (!isAllowedClient(normalized)) {
      await pause();
      throw new HttpError(403, 'This email doesn’t have access yet. Ask your developer to add it.');
    }
    const user = { role: 'client', email: normalized };
    setSession(res, user);
    return { user: publicUser(user), features: features(user) };
  },
});
