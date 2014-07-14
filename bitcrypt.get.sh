#!/bin/bash

ACCESS_TOKEN="pandabearwarriorlove"
KEY_SECRET="lovethepurpleundeniably"
KEY="iamtheencryptionkeyofunspeakablepower"
PORT=4008

curl http://localhost:${PORT}/bitcrypt/ce39e434-b5c9-4962-882b-b9ccda09b6c1 \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
