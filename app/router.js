import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function() {
  this.route('settings');
  this.route('contrast');

  this.route('color-manager', { path: '/' }, function() {
    this.route('colors');
    this.route('palettes');
    this.route('kuler');
  });
});
