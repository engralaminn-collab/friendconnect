/**
 * Remove media objects that never became attached to a message
 * (abandoned uploads). Runs on demand; schedule daily in production.
 */
import { markAbandonedMediaOlderThan } from "../src/server/services/media.service";
import { closePool } from "../src/server/db/client";

const ONE_DAY = 24 * 60 * 60 * 1000;

markAbandonedMediaOlderThan(ONE_DAY)
  .then((removed) => {
    // eslint-disable-next-line no-console
    console.log(`Cleaned up ${removed} abandoned media object(s).`);
    return closePool();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
