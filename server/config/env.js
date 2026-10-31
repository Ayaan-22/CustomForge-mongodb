import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';

// Resolve configuration relative to this package even when launched from the root.
dotenv.config({path:fileURLToPath(new URL('../.env.local', import.meta.url))});
dotenv.config({path:fileURLToPath(new URL('../.env', import.meta.url))});
