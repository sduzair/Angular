#!/usr/bin/env bash
set -euo pipefail

URI="mongodb://mongodb:27017/?replicaSet=rs0"
DB="amldb"

echo "Waiting for PRIMARY..."
until mongosh "$URI" --quiet --eval "quit(rs.isMaster().ismaster ? 0 : 1)"; do
  sleep 1
done

mongoimport --uri "$URI" --db "$DB" --collection amlPartyAccountInfo --file /seed/amlPartyAccountInfo.json --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection partyInfo          --file /seed/partyInfo.json          --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection accountPartyInfo   --file /seed/accountPartyInfo.json   --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection formOptions        --file /seed/formOptions.json        --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection caseRecord         --file /seed/caseRecord.json         --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection accountInfo         --file /seed/accountInfo.json         --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofCashDeposit.json           --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofCashWithdrawal.json        --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofInEmtCibcSender.json        --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofInEmtNonCibcSender.json     --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofOutEmtCibcRecipient.json    --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofOutEmtNonCibcRecipient.json --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofWireIn.json                 --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofCbfeMixedDeposit.json       --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection flowOfFunds --file /seed/fofCashUSDDeposit.json       --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection abm --file /seed/abmCashDeposit.json     --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection abm --file /seed/abmCashWithdrawal.json  --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection abm --file /seed/abmCashUSDDeposit.json --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection olb --file /seed/olbInEmtCibcSender.json      --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection olb --file /seed/olbInEmtNonCibcSender.json   --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection olb --file /seed/olbOutEmtCibcRecipient.json  --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection olb --file /seed/olbOutEmtNonCibcRecipient.json --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection emt --file /seed/emtInEmtCibcSender.json      --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection emt --file /seed/emtInEmtNonCibcSender.json   --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection emt --file /seed/emtOutEmtCibcRecipient.json  --jsonArray
mongoimport --uri "$URI" --db "$DB" --collection emt --file /seed/emtOutEmtNonCibcRecipient.json --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection wire --file /seed/wireIn.json --jsonArray

mongoimport --uri "$URI" --db "$DB" --collection otc --file /seed/cbfeMixedDeposit.json --jsonArray


echo "Restoring parties collection..."
mongorestore --uri="$URI" --nsInclude="$DB.parties" /seed/dump/

# todo: composite index for selections

echo "Seed done."

