#!/bin/bash
set -e

# Import strTxns data into MongoDB
mongoimport --db strTxnDB --collection strTxns --file /docker-entrypoint-initdb.d/MOCK_DATA_cashDepositComplete.json --jsonArray
mongoimport --db strTxnDB --collection strTxns --file /docker-entrypoint-initdb.d/MOCK_DATA_cashWithdrawalComplete.json --jsonArray

# Create empty sessions collection
mongosh strTxnDB --eval "db.createCollection('sessions')"