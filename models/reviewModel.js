// we need the text review,rating,createdAt,ref to Tour, ref to User
//review is doing two parent referecning
const mongoose = require('mongoose');
const Tour = require('../models/tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true,
      maxlength: [40, 'A review must have less or equal than 40 characters'],
      minlength: [10, 'A review must have more or equal than 10 characters']
    },
    rating: {
      type: Number,
      min: [1, 'Review rating must be above 1.0'],
      max: [5, 'Review rating must be below 5.0']
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    //Two Parent references. Where: User is a parent(Author), Tour is a parent, Review is a child
    //This is because we dont want a huge array of reviews in the parent which is users and tours
    //so we take it to parent referencing to prevent this.
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must be belong to a user']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    }
  },
  //to display a virtual property not stored in the database and also to use the virtual property to
  //calculate some other value, we want it to show up in the response json.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
reviewSchema.pre(/^find/, function(next) {
  //   this.populate({
  //     path: 'user',
  //     select: 'name photo'
  //   }).populate({
  //     path: 'tour',
  //     select: 'name '
  //   });
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

// we created it as a static method because we need it to call the aggregate function on the model
// because the this variable in this case is the review model
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    //first step is to select all the reviews that actually belongs to that particular tour
    // so we group the reviews by same tour first.
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour', //we are grouping all the tours that have the same tourId.
        nRating: { $sum: 1 }, // if there are 5 review doc for the current tour, 1 is added for each, so 5 reviewDoc
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function(next) {
  //this points to current review
  //this.constructor is the current model that created the document which is Review
  this.constructor.calcAverageRatings(this.tour);
});

//findByIdAndUpdate this is found in query middle ware and not doc middleware
//findByIdAndDelete

reviewSchema.pre(/^findOneAnd/, async function(next) {
  //we use this to find the particular document and get the id
  this.r = await this.findOne(); //pass the current doc from pre middleware to post middleware
  // and store it on the query this variable
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // this.r = await this.findOne();: does not work here as the query has already executed
  //so we dont have access to the current doc. hence the need for this await this.findOne()
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

//POST /tour/234fad4/reviews 234fad4=tourId
//GET /tour/234fad4/reviews
//GET /tour/234fad4/reviews/94887Fda
