IRCBoks
=======

IRCBoks is Web Based IRC Client with persistent connection.
- Multiuser support
- IRC connection will not be closed when you close the browser
- Use Go in server side and AngularJS in client side
- User and chat data stored in mongodb
- AngularJS use websocket to communicate with Go backend


Supported IRC Commands
----------------------
- join
- part
- nick
- msg

More commands will follow. IRCBoks is still in early stage, it still focus in core functionalities.

Installation
------------
Download code: git clone https://github.com/iwanbk/ircboks.git

##### Build AngularJS UI
Assuming you already have npm installed:

Go to AngularJS UI directory

```sh
cd ui
```

Install grunt-cli

```sh
npm install -g grunt-cli
```

Install required packages

```sh
npm install
```

Build

```sh
grunt
```

##### Install gpm and gvp (recommended)
IRCBoks Go server use [gpm](https://github.com/pote/gpm) and [gvp](https://github.com/pote/gvp) to manage dependencies.

Please visit gvp and gpm website for installation details.

##### Install Go server dependencies

```sh
cd server
gvp init (only needed once)
source gvp in
gpm install
```
Of course you can manually install all dependencies, you can find all needed package in Godeps file.

##### install and configure mongodb
The easiest way is using free plan from [mongolab](https://mongolab.com).

It currently assume that you use database named 'ircboks'.

##### Run the server
- copy timber.xml.example to timber.xml. It is configuration file for logging facility

```sh
cp timber.xml.example timber.xml
```

- copy config.json.example to config.json. It is configuration file for the server.

```sh
cp config.json.example config.json
```
You need to edit mongodb_uri in config.json. Replace it with your mongodb connection string.

- run it

```sh
go run *.go
```
You can find IRCBoks in http://localhost:3000

You need to register before login. There is no email verification now.

License
-------
MIT License