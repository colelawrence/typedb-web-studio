/**
 * LiveStore web worker for TypeDB Studio.
 *
 * This worker runs the LiveStore instance in a separate thread.
 */

import { makeWorker } from "@livestore/adapter-web/worker";
import { schema } from "./schema";

makeWorker({ schema });
