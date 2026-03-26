const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  //this is to give the server basically time to finish all the request that are still pending at the time
  //only after that before we then kill the application.
  process.exit(1);
  //in production we should have a tool in place which restarts the application after crashing.
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
    : process.env.DATABASE_LOCAL;

mongoose //for mongoDB atlas cluster.
  .connect(DB, {
    // .connect(process.env.DATABASE_LOCAL, {
    //for mongoDB compass.
    useFindAndModify: false,
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  .then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//Global error handling of all unhandled promise rejection. central errors.
process.on('unhandledRejection', err => {
  //shutdown the application when you can't connect to the db or presence of any unhandled promise rejection
  console.log('UNHANDLER REJECTION! Shutting down...');
  console.log(err.name, err.message);

  server.close(() => {
    //this is to give the server basically time to finish all the request that are still pending at the time
    //only after that before we then kill the application.
    process.exit(1);
  });
});
