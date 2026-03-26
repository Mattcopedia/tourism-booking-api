import '@babel/polyfill';
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { bookTour } from './stripe';
import { updateSettings } from './updateSettings';
// DOM Elements
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');
console.log('bookBtn =', bookBtn);

console.log('userPasswordForm', userPasswordForm);
console.log('userDataForm', userDataForm);

const logOutBtn = document.querySelector('.nav__el--logout');

//Values: at this point, email and password are not defined right in the beginning when the page is trying to load.

if (loginForm) {
  // {} used because it was exported this way export const login but if it is export default const, then {} wont be used
  loginForm.addEventListener('submit', e => {
    //Values
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm) {
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    console.log('form', form);
    console.log('photo file:', document.getElementById('photo').files[0]);

    for (let [key, value] of form.entries()) {
      console.log(key, value);
    }
    updateSettings(form, 'data');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('functionCalled');

    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.querySelector('.btn-save-password').textContent = 'Save password';

    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (bookBtn) {
  console.log('bookBtn2 =', bookBtn);

  bookBtn.addEventListener('click', e => {
    console.log('called');
    e.target.textContent = 'Processing...';
    //event.target is basically the element that was clicked which is the button.
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

//Delegation
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  console.log(locations);
  displayMap(locations);
}
