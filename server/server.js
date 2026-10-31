import './config/env.js';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import {createApp} from './app.js';
import {logger} from './middleware/logger.js';
import {closeRateLimitStore} from './config/rateLimit.js';
import {processOrderEmails} from './utils/orderEmailOutbox.js';
import {recoverStripeReservations} from './controllers/paymentController.js';

try {
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const app = createApp();
  let workerRun=null;
  const runWorkers=()=>{
    if(workerRun)return;
    workerRun=Promise.allSettled([processOrderEmails(),recoverStripeReservations()]).finally(()=>{workerRun=null;});
  };
  const workerTimer=setInterval(runWorkers,15000).unref();
  runWorkers();
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => logger.info(`CustomForge MongoDB API listening on http://localhost:${port}/api/v1`));
  let stopping = false;
  const stop = async code => {
    if (stopping) return;
    stopping = true;
    clearInterval(workerTimer);
    const deadline = setTimeout(()=>process.exit(1),15000).unref();
    await new Promise(resolve=>server.close(resolve));
    await workerRun;
    await closeRateLimitStore();
    await mongoose.disconnect();
    clearTimeout(deadline);
    process.exit(code);
  };
  process.on('SIGTERM',()=>void stop(0));
  process.on('SIGINT',()=>void stop(0));
  process.on('unhandledRejection',error=>{logger.error(error.message);void stop(1);});
} catch (error) {
  logger.error(`API startup failed: ${error.message}`);
  await mongoose.disconnect();
  process.exitCode = 1;
}
