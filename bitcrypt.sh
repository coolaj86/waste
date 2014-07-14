#!/bin/bash

ACCESS_TOKEN="pandabearwarriorlove"
KEY_SECRET="lovethepurpleundeniably"
KEY="iamtheencryptionkeyofunspeakablepower"
PORT=4008

curl http://localhost:${PORT}/bitcrypt/key \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "'${KEY}'", "secret": "'${KEY_SECRET}'" }'

curl http://localhost:${PORT}/bitcrypt/key \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "'${KEY}'", "secret": "'${KEY_SECRET}'" }'

curl http://localhost:${PORT}/bitcrypt/key \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "8'${KEY}'8", "secret": "'${KEY_SECRET}'" }'

# payload MUST be in the field 'value'
curl http://localhost:${PORT}/bitcrypt \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "value": "wonkadonka" }'

echo ""
echo "NEARLY DONE"
echo ""

curl http://localhost:${PORT}/bitcrypt/ce39e434-b5c9-4962-882b-b9ccda09b6c1 \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo ""
echo "ALL DONE"
echo ""
