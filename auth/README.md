Order of Operations

1. The callback specified with passport.use(new Strategy(conf, fn));
2. The callback specified at app.get('/auth/strategy/callback', fn)
3. The serialize callback
4. The deserialize callback?
