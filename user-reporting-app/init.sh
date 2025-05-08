#!/bin/bash
set -e

# Import users data into MongoDB
mongoimport --db userAppDB --collection users --file /docker-entrypoint-initdb.d/usersData.json --jsonArray

# Create empty sessions collection
mongosh userAppDB --eval "db.createCollection('sessions')"