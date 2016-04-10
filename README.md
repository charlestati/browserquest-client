BrowserQuest
============

BrowserQuest is a HTML5/JavaScript multiplayer game experiment.


What's different?
-----------------

- Scripts are in JS ES2015, transpiled using Babel
- Modules are imported with Browserify instead of RequireJS
- Development workflow with Gulp
- Code is mostly compliant with Airbnb's ESLint rules
- Use lodash instead of underscore (personal preference)


Quickstart
----------

1. `npm install`
2. `npm build`

Use `npm serve` for development (live reload, no error on linting…)


Todo
----

- Use Bluebird to switch from callbacks to promises
- Use arrow functions instead of `var self = this;`
- Load sprites and config files at compilation time
- Remove unused functions and methods
- Use a logger (I imported `log` to allow compilation but I don't know if it works browser side)
- Rename variables already declared in the upper scope (no-shadow)
- Find something prettier that `const myVar = _myVar` for parameter reassignment (no-param-reassign)
- Use an alternative for the `argument` variable to remove the `Function.prototype.bind()` method (prefer-rest-params)


Disclaimer
----------

Do not use in production, there are still a lot of errors!
This is an experimental project.


License
-------

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.


Credits
-------

Created by [Little Workshop](http://www.littleworkshop.fr):

* Franck Lecollinet - [@whatthefranck](http://twitter.com/whatthefranck)
* Guillaume Lecollinet - [@glecollinet](http://twitter.com/glecollinet)


[nenuadrian](https://github.com/nenuadrian) who brought up to date and upgraded BrowserQuest to the latest SOCKET.IO plus other minor improvements
