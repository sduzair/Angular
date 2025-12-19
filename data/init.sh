#!/bin/bash
set -e

# Import source data into MongoDB
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofCashDeposit.json --jsonArray
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofCashWithdrawal.json --jsonArray
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofInEmtCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofInEmtNonCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofOutEmtCibcRecipient.json --jsonArray
mongoimport --db strTxnDB --collection srcFlowOfFunds --file /docker-entrypoint-initdb.d/fofOutEmtNonCibcRecipient.json --jsonArray

mongoimport --db strTxnDB --collection srcABM --file /docker-entrypoint-initdb.d/abmCashDeposit.json --jsonArray
mongoimport --db strTxnDB --collection srcABM --file /docker-entrypoint-initdb.d/abmCashWithdrawal.json --jsonArray

mongoimport --db strTxnDB --collection srcOLB --file /docker-entrypoint-initdb.d/olbInEmtCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcOLB --file /docker-entrypoint-initdb.d/olbInEmtNonCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcOLB --file /docker-entrypoint-initdb.d/olbOutEmtCibcRecipient.json --jsonArray
mongoimport --db strTxnDB --collection srcOLB --file /docker-entrypoint-initdb.d/olbOutEmtNonCibcRecipient.json --jsonArray

mongoimport --db strTxnDB --collection srcEMT --file /docker-entrypoint-initdb.d/emtInEmtCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcEMT --file /docker-entrypoint-initdb.d/emtInEmtNonCibcSender.json --jsonArray
mongoimport --db strTxnDB --collection srcEMT --file /docker-entrypoint-initdb.d/emtOutEmtCibcRecipient.json --jsonArray
mongoimport --db strTxnDB --collection srcEMT --file /docker-entrypoint-initdb.d/emtOutEmtNonCibcRecipient.json --jsonArray

# Create empty sessions collection
mongosh strTxnDB --eval "db.createCollection('sessions')"