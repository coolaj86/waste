Review purchases

Multi-plex SMS messages by most-recent sender (and store history).

Verify email address via short code in email
Verify phone number via short code in SMS

use username, not email for logins
hash ids for logins `local:coolaj86` -> `local:<config.js.salt+id:md5sum>`



done(err, user, info)
----

All of the Logins need to be redone as to allow for passing `{ error: err, user: login, info: info}`.

This will enable us to get info about why a login failed back to a user

i.e. username doesn't exist or invalid password
