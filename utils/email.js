const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

//new Email(user,url).sendWelcome()
//create a robust email system so you can keep adding new methods to it to send different emails to different scenarios.

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Ofeimun Mathias <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Using SendGrid?', process.env.NODE_ENV === 'production');
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: process.env.SENDGRID_HOST,
        port: Number(process.env.SENDGRID_PORT),
        // service: 'SendGrid',
        secure: false,
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      secure: false
    });
  }

  //This broad send function
  async send(template, subject) {
    //Send the actual email;

    //1) Render HTML based on a pug template. __dirname is the name of the currently running scriptin this case the util folder
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject
      }
    );
    //2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.convert(html) //text version of email
    };

    //3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }
  //the specific send functions that will call the broader send function which is doing the actual work.
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }
  async confirmEmail() {
    await this.send('confirmEmail', 'Please confirm your email address');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

//Test email mailTrap

/**
 const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // 1) Create a transporter // you must create a transporter no matter the service

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, // 2525
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    secure: false
  });

  transporter.verify(function(error, success) {
    if (error) {
      console.log('EMAIL ERROR:', error);
    } else {
      console.log('Server is ready to take our messages');
    }
  });

  //   const transporter = nodemailer.createTransport({
  //     service: 'Gmail',
  //     auth: {
  //       user: process.env.EMAIL_USERNAME,
  //       pass: process.env.EMAIL_PASSWORD
  //     }
  //     //Activate the "less secure app" option in gmail(Not good for a production because of 500 emails per day).
  //   });

  //2) Define the email options
  const mailOptions = {
    from: 'Ofeimun Mathias <mathiasofeimun@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message
    //html use for later
  };

  //3) Actually send the email.
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;

 */
