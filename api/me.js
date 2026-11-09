import { route } from './_lib/http.js';
import { currentUser, features, publicUser } from './_lib/session.js';

export default route({
  async GET(req) {
    const user = currentUser(req);
    return user ? { user: publicUser(user), features: features(user) } : { user: null };
  },
});
