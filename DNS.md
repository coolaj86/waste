In order for MX address to work on subdomains it appears that the following must be true:

  * an A record IP address (not CNAME alias) should be used for the `foomail.example.com` subdomain
  * any wildcard record `*.example.com` should be created after the `foomail.example.com`

Or at least when receiving mail wasn't working for me I changed both of those things and then it began to work.
