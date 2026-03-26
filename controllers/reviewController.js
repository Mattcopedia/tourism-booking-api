//one endpoint for getting all reviews and one end point for creating new reviews
const catchAsync = require('../utils/catchAsync');
const Review = require('./../models/reviewModel');
const APIFeatures = require('./../utils/apiFeatures');
const factory = require('./handlerFactory');

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {}; // find all the reviews
//   if (req.params.tourId) filter = { tour: req.params.tourId }; //find all reviews for a specific tour
//   //Execute query
//   const features = new APIFeatures(Review.find(filter), req.query)
//     .sort()
//     .paginate();
//   const reviews = await features.query;
//   //send request
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }
//   });
// });
exports.getAllReviews = factory.getAll(Review);
exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// exports.createReview = catchAsync(async (req, res, next) => {
//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newReview
//     }
//   });
// });

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
