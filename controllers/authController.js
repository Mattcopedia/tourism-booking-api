const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const catchAsync = require('./../utils/catchAsync');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  // secure: true, only needed in production
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true, //cookie will only be sent on an encrypted connection. that means only when we use https
    httpOnly: true //prevent cross site scripting and then the client/browser receive the cookie and store it and send it back with all future request to the server
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  //a cookie is a small peice of text that a server can send to the client.
  //then the client receive it and store it and send it back with all future request to the server

  //remove the password from the output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

//never store plain password in a database but encrypt it
exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  //so that not everyone can register as an admin
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const resetToken = user.createConfirmEmailResetToken();
  await user.save({ validateBeforeSave: false });

  const confirmEmailURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/confirmEmail/${resetToken}`;

  try {
    await new Email(user, confirmEmailURL).confirmEmail();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    console.log('err', err);
    return next(
      new AppError('There was an error sending the email. Try again Later'),
      500
    );
  }
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  console.log('TOKEN:', req.params.token);
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  console.log('hashedToken:', hashedToken);

  const user = await User.findOne({
    emailConfirmToken: hashedToken,
    emailConfirmExpires: { $gt: Date.now() }
  }).setOptions({ includeInactive: true });
  console.log('user:', user);

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.emailConfirmed = true;
  user.active = true;
  user.emailConfirmToken = undefined;
  user.emailConfirmExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log('url', url);
  await new Email(user, url).sendWelcome();
  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //check if the user exists and password is correct
  const user = await User.findOne({ email: email }).select(
    '+password +emailConfirmed'
  );

  console.log(user);
  //userSchema.methods.correctPassword
  //This is an instance method from quering user model available on all the user documents

  if (!user || !(await user.correctPassword(password, user.password))) {
    //dont so it separately so that the attacker does not know if the email or passoword is incorrect
    return next(new AppError('Incorrect email or Password', 401));
  }

  //check if the user exists but has not confirmed his email
  if (!user.emailConfirmed) {
    return next(
      new AppError('You have not confirmed your email address yet', 401)
    );
  }

  //if everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log(`token`, token);
  if (!token) {
    return next(
      new AppError('You are not logged in! please login to get access.', 401)
    );
  }
  //2) Verification token
  // promisify expects a function; pass jwt.verify to promisify, then call the resulting function
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);

  //3) Check if User exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user belonging to this token no longer exist', 401)
    );

  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//Only for rendered pages, no errors.
exports.isLoggedIn = async (req, res, next) => {
  //1) Getting token and check if its there
  if (req.cookies.jwt) {
    try {
      //for our entire rendered website, the token will only be rendered from the cookie and not auth header
      //auth header is for API.

      //verifies the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      console.log(decoded);

      //3) Check if User exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      //4) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a logged in user;
      res.locals.user = currentUser; //make the user variable accesible to the pug templates.
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//here closures are used so that the inner middleware function can have access to the arguments of
// the outer function. since the argument could not be passed to restricto Middleware function
exports.restrictTo = (...roles) => {
  return async (req, res, next) => {
    //roles is an array of arguments['admin','lead-guide'], role = 'user'
    if (!roles.includes(req.user.role)) {
      return next(
        //403 is for authorization and role permissions.
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTED Email.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  //2) Generate the random reset token.
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    //3) Send it to user's email.
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 min)',
    //   message
    // });
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    //if we did not succeed in sending the email, we dont need to store these values in our database
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again Later'),
      500 //500 is error happening on server.
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  //2) if token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //for auth always use save because we always want to run all the validators before storing the database.
  //using update will skip validation. using save is also important for save middleware functions.
  await user.save();

  //3) update changedPasswordAt property for the user

  //4) Log the user in, send JWT
  //if everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection. ask for password because it not included in the output
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User not Found'), 404);
  }
  //2) Check if the posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Incorrect Password'), 401);
  }
  //3) if so, the update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  //dont use any update method on passwords but use save method so we can encrypt our password.
  await user.save();

  //we usually have a separate form to update our password

  //4) Log User in,send JWT
  createSendToken(user, 200, res);
});

//Best practices
//implement maximum login attempts within a specific timeframe.
//confirm user email address after creating first account
//dont store jwt in local storage but on httpOnlyCookies due to cross scripting because the attacker
//can VIEW local storage by injecting scripts to run his malicious code. 141.
//sanitize user data and special http headers using middle ware.
//limit the amount of data that can be sent in a post or patch request.
//avoid evil regular expressions.
//always use https so that only server and client can communicate or listen to each other and no one can steal our jwt
