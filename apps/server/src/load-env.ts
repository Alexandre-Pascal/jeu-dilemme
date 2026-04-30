/**
 * Charge le `.env` à la racine du monorepo (dev : `pnpm dev` sans passer par dotenv-cli sur le process serveur).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
dotenv.config({ path: rootEnv });
