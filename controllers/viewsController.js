const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get tour data from collection
  const tours = await Tour.find();
  //2) Build template

  //3)Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All tours', //pass tours to this obj response that is going to be passed to the overview template
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  res.status(200).render('tour', {
    title: tour.name,
    tour
  });
});

exports.getLoginForm = async (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1 Find all bookings
  //this gives us all the booking documents that belongs to current user
  const bookings = await Booking.find({ user: req.user.id });
  //2) Find Tours with the returned IDs
  //loops through the entire bookings array and on each element, it will grab el.tour and get the id
  const tourIDs = bookings.map(el => el.tour);
  //get the tours corresponding to those ids
  // $in will select all the tours which have an id that is in the tours id array
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

exports.updateUserData = async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      //these are the name of the fields because we used them as the name attributes in the html form
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true //run validators for only name and email
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
};
