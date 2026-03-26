const multer = require('multer');
const sharp = require('sharp'); //image processing and resizing in nodejs
const User = require('./../models/userModel');
const cron = require('node-cron');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

//store it in a folder in our project
const multerFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    //user-79378-333333.jpg id-timestamp-extension
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  }
}); //store in file storage

//save image into memory as a buffer
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  //test if the uploaded file is an image.if yes pass true into callback function and if not pass false;
  //works for all files you want to upload.
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! please upload only images', 400), false);
  }
};
const upload = multer({
  fileFilter: multerFilter,
  storage: multerStorage
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  //fine tune our image processing
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); //store or write the file into a system in public/users folder

  next();
  //crops the image so that it has 500 x 500 square
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const tours = await User.find();
//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
// });
exports.getAllUsers = factory.getAll(User);

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = factory.getOne(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

//role of user to update a particular user data
exports.updateMe = catchAsync(async (req, res, next) => {
  console.log('req.file', req.file);
  console.log(req.body);
  //1)create error if user POSTS password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. please use /updateMyPassword'
      ),
      400
    );
  }
  //2) Update User document
  //when updating non sensitive data like names or emails, we can now use findByIdAndUpdate
  //second argument is to only select name and email. so that user cant change fields like role.
  //filtered out unwanted field objects
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename; //store image name to our documents
  //allows you to update only specific fields.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead'
  });
};
//role of admin to update all users data
//w should not attempt to change passwords using the updateUser because the findByIdAndUpdate does not
//run the saved middleware
/**
 This is a direct MongoDB update, NOT a document save.
It does NOT:
Run save middleware
Run pre('save') or post('save')
Hash passwords
Update passwordChangedAt 
Run custom validation logic tied to save
 */

exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
