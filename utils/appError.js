//AppError class inherits Error class
class AppError extends Error {
  constructor(message, statusCode) {
    //super is a method used to make use of the argument in the contructor of the parent class like message paranter in the parent Error class.
    super(message);
    this.statusCode = statusCode;
    //status could be failed or error. 400 fail e.g bad request. 500 error i.e internal server error.
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    //we will only send an error message to the client for these operational errors created using this class
    this.isOperational = true;
    //this will ensure not to add an extra stack trace when the this class is called.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
