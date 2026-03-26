const path = require('path'); // this is a node module while helps manipulate path names
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const cron = require('node-cron');
const cleanupUnconfirmedUsers = require('./utils/cleanupUnconfirmedUsers');

//Start express app
const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, './views')); //root directory name + views folder

//servering static files. all static assets will be served from a folder called public including css and img files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// 1) Global MIDDLEWARES

//data sanitization means basically to clean all the data that comes into the application from malicious code.

// Set security HTTP headers

app.use(
  //use it early in the middle ware stack

  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: ["'self'", 'https://js.stripe.com', 'https://api.mapbox.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://api.mapbox.com',
        'https://events.mapbox.com'
      ],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://api.mapbox.com',
        'https://fonts.googleapis.com'
      ],
      workerSrc: ["'self'", 'blob:']
    }
  })
);
//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 0 * * *', async () => {
    try {
      await cleanupUnconfirmedUsers();
    } catch (err) {
      console.error(err);
    }
  });
}

//limit requests from the same api
const limiter = rateLimit({
  max: 100, // This allows a maximum amount of 100 requests from the same ip in 1 hour.
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour'
});
app.use('/api', limiter); //here we apply this limiter for all the routes that start with /api at the beginning

//body parser, reading data from the body into req.body.
// we also limit the amount of data that comes in the body. it will parse this string into meaningful data.
app.use(express.json({ limit: '10kb' }));

//
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

//data sanitization against noSQL query injection
//data sanitization against cross site scripting attack (xss).
app.use(mongoSanitize()); // filter out $ and . from req.query req.params req.body
app.use(xss()); //clean any user input from malicious html code. data sanitization against xss attack

//prevent parameter pollution and clear up the query string;
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
); 
//only works to compress text
app.use(compression());

//Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log('cookies', req.cookies);
  next();
});

// 3) ROUTES
//if the router url exist, it would have stopped in this line of code
// because the res and req cycle will have finished running.
// and would not have reached app.all and not get executed.c
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//catch all the url routes that are not defined by our handlers and then throw an error.
/**Why does this code below work. if we are able to reach this point of block of code. it means
 * the request and response cycle was not yet finished at this point of our code
 */

app.all('*', (req, res, next) => {
  /**
  this will just pass the error to the middleware
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'failed';
  err.statusCode = 404;
   */

  //if next receives an argument, no matter what it is express will automatically know that there was an error,
  //it will assume whatever argument we pass into next is going to be an error.
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
