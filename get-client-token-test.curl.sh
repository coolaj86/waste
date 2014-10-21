#
# Client Credentials
#

# Basic Auth Header
function getSecureWithHeaders() {
  curl "http://local.foobar3000.com:4004/oauth/token" \
    -X POST \
    --user 'pub_test_key_1:sec_test_secret' \
    -d 'grant_type=client_credentials&scope=me:email::&state=randomstr'
}

# Without Header
function getSecureWithoutHeaders() {
  curl "http://local.foobar3000.com:4004/oauth/token" \
    -X POST \
    -d 'grant_type=client_credentials&scope=me:email::&state=randomstr&client_id=pub_test_key_1&client_secret=sec_test_secret'
}

# Basic Auth Header
function getInsecureWithHeaders() {
  curl "http://local.foobar3000.com:4004/oauth/token" \
    -X POST \
    --user 'pub_test_key_2:anonymous' \
    -d 'grant_type=client_credentials&scope=me:email::&state=randomstr'
}

# Without Header
function getInsecureWithoutHeaders() {
  curl "http://local.foobar3000.com:4004/oauth/token" \
    -X POST \
    -d 'grant_type=client_credentials&scope=me:email::&state=randomstr&client_id=pub_test_key_2&client_secret=anonymous'
}

#
# Resource Owner Password
#
function getPassword() {
  curl "http://local.foobar3000.com:4004/oauth/token" \
    -X POST \
    -d 'grant_type=password&scope=fooscope&state=randomstr&client_id=pub_test_key_2&client_secret=anonymous&username=user&password=super secret'
}

getInsecureWithoutHeaders

exit 0

NOTE: Although you may use an empty string '' or omit the client_secret altogether
      providing the cilent_secret as 'anonymous' is a good explicit reminder that
      the action could be performed by any client with the intent to operate within
      the context of the specified client id.
