const mongoose = require('mongoose');

/**
 {
  user: ObjectId,  // who made the booking
  tour: ObjectId   // which tour was booked
} 
 */

//so bookings has to keep track of the tour booked and who booked the tour.
// a booking is done by a particular user for a particular tour
//so we use parent referencing on the booking by keeping a reference to the tour being purchased
//and also to the user who made the purchase and booked the tour.
const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User']
  },
  price: {
    type: Number,
    require: [true, 'Booking must have a price']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  //use bookings api to manually create a tour
  paid: {
    type: Boolean,
    default: true
  }
});
bookingSchema.pre(/^find/, function(next) {
  //only guides and admins will be able to do them.
  this.populate('user').populate({
    path: 'Tour',
    select: 'name'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
