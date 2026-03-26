const AppError = require('../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value ${value}. please use another value!`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token, please login again!', 401);

const handleValidationErrorDB = () => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTExpiredError = err =>
  new AppError('Your token has expired! please log in again', 401);

const sendErrorDev = (err, req, res) => {
  //A API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }
  //B rendered Website
  console.log('ERROR ', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // A API
  if (req.originalUrl.startsWith('/api')) {
    //operational. trusted error: send message to client
    // when user performs an action like enter email and password.
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // B Programming or other unknown error: dont leak error details

    // 1) Log error
    console.error('ERROR 😄', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong'
    });
  }
  //RENDERED WEBSITE
  //operational. trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  //1) ERROR
  console.log('ERROR ', err);
  //Programming or other unknown error
  //2 ) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

//express knows that this is an error handling middleware
//because it has 4 arguments
//global error handling middleware
module.exports = (err, req, res, next) => {
  console.log(err.stack); //it tells us where the error occured.
  //500 is internal server error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    //this is done so our error object will correctly copy the message and other error properties.
    //Test it in a through enough way.
    let error = Object.create(err);
    if (error?.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error?.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// Key traits of Programming or unknown errors:

// Caused by developer mistakes or system failures

// You did NOT plan for them

// Could expose sensitive details

// Should NOT be shown to users
