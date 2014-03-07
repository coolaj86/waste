angular-project-template
============

Install
===

```bash
git clone https://github.com/coolaj86/angular-project-template.git
pushd angular-project-template/

npm install -g yo
npm install -g bower
npm install -g generator-angular

npm install
bower install

grunt build --force
```

Use
===

```bash
grunt build --force
grunt serve

# The --force is in case you don't have compass installed
# If you feel the need for compass, figure out how to install it
# and immediately apply FML relief cream to the affected areas generously
```

Configure
===

For social integration you'll need to edit `config.js` and
replace the `XXX`s with your own keys and secrets

```bash
vim config.js
```
