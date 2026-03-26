const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const createToken = require('../utils/createToken');
//name,email,photo,password,passwordConfirm
//never store plain password in a database but encrypt it. put in the models

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'a user must have a name'],
      trim: true,
      maxlength: [30, 'A user name must have less or equal than 30 characters'],
      minlength: [3, 'A user name must have more or equal than 3 characters']
    },
    email: {
      type: String,
      required: [true, 'a user must have an email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },

    photo: {
      type: String,
      default: 'default.jpg'
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'a user must have a password'],
      minlength: [8, 'a user password must have a minimum of 8 characters'],
      select: false,
      validate: {
        validator: function(val) {
          // Must contain uppercase, lowercase, number, special character
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(
            val
          );
        },
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }
    },
    passwordConfirm: {
      type: String,
      required: [true, 'please confirm your password'],
      validate: {
        // Works only on CREATE and SAVE!!!
        validator: function(el) {
          return el === this.password;
        },
        message: 'Passwords do not match'
      }
    },
    passwordChangedAt: Date,
    emailConfirmToken: String,
    emailConfirmExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailConfirmed: {
      type: Boolean,
      default: false,
      select: false
    },
    active: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function(next) {
  // we want it to only work when password is changed or created
  //if password is not modified then exit ths function and go to the next one
  if (!this.isModified('password')) return next();
  //you need hashing and bycrpt due to hackers and brutte force. 12 is computation cost to encrypt the password
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; // we dont need to persist passwordConfirm field to the database
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function(next) {
//   //this points to the current query
//   this.find({ active: { $ne: false } });
//   next();
// });

userSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeInactive) {
    //this.getOptions() is metadata options on query middleware
    this.find({ active: { $ne: false } });
  }
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; //100 < 200
  }
  //false means is not changed. this means the time the token was issued is less than the password changed timestamp
  return false;
};

// //use of instance method should be out of controllers
// userSchema.methods.createPasswordResetToken = function() {
//   //This should be a random string but should not be cryptographically strong as a bcrypt hash
//   const resetToken = crypto.randomBytes(32).toString('hex');

//   //we should never store a plain resetToken in the database but hash it so hackers can't change it.

//   this.passwordResetToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');

//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //reset in 10 minutes
//   return resetToken;
// };

//use of instance method should be out of controllers
userSchema.methods.createPasswordResetToken = function() {
  const { token, hashedToken, expires } = createToken();

  this.passwordResetToken = hashedToken;
  this.passwordResetExpires = expires;

  return token;
};

userSchema.methods.createConfirmEmailResetToken = function() {
  const { token, hashedToken, expires } = createToken();
  this.emailConfirmToken = hashedToken;
  this.emailConfirmExpires = expires;
  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
