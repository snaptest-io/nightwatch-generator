# SnapTest NightwatchJS Test Generator

Generates test folders in the populate NightwatchJS framework via the [snaptest-cli](https://www.npmjs.com/package/snaptest-cli).

Master branch is published to npm and used in snaptest-cli as official NightwatchJS generator when the `-r nightwatch` flag is used.

`snaptest -r nightwatch <other flags>`

Contributions in the forms of PRs and tickets are welcome.

### To Develop/Contribute

First, make sure you have the snaptest-cli tool installed by running `npm install -g snaptest-cli`.
Then use snaptest-cli's custom generator flag to utilize your own branch/fork of this generator:

`snaptest -c <absolute or relative path to generators index.js> ...`

#### Full Example:

`snaptest -c ./index.js -t iHrsRTzgENFUVI1TPAtIFqyd0QElssxy1TA0X9y`

1. The -c flag specifics a "custom" generator, which lets you use a local generator on your filesystem.  This replaces the -r flag which specifies an official generator.  
1. The -t flag specific the access token that you can access via the snaptest extension.
1. No folder or project is specified, so this will generate all the tests in your personal cloud account.   
 
#### More info

1. snaptest-cli reference at [snaptest-cli](https://www.npmjs.com/package/snaptest-cli)
1. Use the SnapTest extension code generator page to explore your options.


 