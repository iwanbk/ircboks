package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	simplejson "github.com/bitly/go-simplejson"
	"github.com/iwanbk/ogric"
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo/bson"
	"time"
)

type IrcStartMsgData struct {
	UserId   string `json:"userId"`
	Nick     string `json:"nick"`
	Password string `json:"password"`
	User     string `json:"user"`
	Channel  string `json:"channel"`
	Server   string `json:"server"`
}

type IrcStartMsg struct {
	Event string          `json:"event"`
	Data  IrcStartMsgData `json:"data"`
}

type IrcJoinMsgData struct {
}

type IrcMsg struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

//getData get value of a json key
//TODO optimization
func (msg *IrcMsg) getData(key string) string {
	m := msg.Data.(map[string]interface{})
	for k, v := range m {
		switch vv := v.(type) {
		case string:
			if k == key {
				return vv
			}
		default:

		}
	}
	return ""
}

type IRCClient struct {
	userId   string
	nick     string
	password string
	user     string
	server   string

	client *ogric.Ogric

	//event channel
	evtChan chan ogric.Event

	//input & output channel
	inChan chan string

	//channel  joined
	chanJoinedSet map[string]bool
}

func NewIRCClient(userId, nick, password, user, server string, inChan chan string) (*IRCClient, error) {
	c := new(IRCClient)
	c.userId = userId
	c.nick = nick
	c.password = password
	c.user = user
	c.server = server
	c.inChan = inChan

	//c.conn = irc.IRC(nick, user)
	c.client = ogric.NewOgric(nick, user, server)
	c.client.Password = password

	c.chanJoinedSet = make(map[string]bool)

	return c, nil
}

func (c *IRCClient) Start() error {
	evtChan, err := c.client.Start()
	c.evtChan = evtChan

	return err
}

//dumpInfo dumps all info about this client
func (c *IRCClient) dumpInfo() string {
	var chanArr []string
	data := make(map[string]interface{})
	data["nick"] = c.nick
	data["user"] = c.user
	data["server"] = c.server

	for k, v := range c.chanJoinedSet {
		if v == true {
			chanArr = append(chanArr, k)
		}
	}
	data["chanlist"] = chanArr

	js, _ := simplejson.NewJson([]byte("{}"))
	js.Set("event", "ircBoxInfo")
	js.Set("data", data)

	jsStr, err := simpleJsonToString(js)
	if err != nil {
		return "{}"
	}
	return jsStr
}

//start an IRC client
func IrcStart(userId, nick, password, username, server string, ws *websocket.Conn) (*ClientContext, error) {
	log.Debug("[IrcStart. userId=" + userId + ". Nick = " + nick + ". Username = " + username + ". Server = " + server)

	//initialize IRC client
	inChan := make(chan string)
	client, _ := NewIRCClient(userId, nick, password, username, server, inChan)

	log.Debug("[IrcStart]starting irc client")
	err := client.Start()
	if err != nil {
		return nil, err
	}

	//register client context
	ctx := ClientContextRegister(userId, nick, server, username, inChan, ws)

	log.Debug("[IrcStart] starting ircController")
	go client.Loop(ctx)

	return ctx, nil
}

//processIrcMsg will unmarshal irc command json string and dispatch it to respective handler
func (client *IRCClient) processIrcMsg(msgStr string) {
	log.Debug("[processIrcMsg] msg = " + msgStr)
	ircMsg := IrcMsg{}
	err := json.Unmarshal([]byte(msgStr), &ircMsg)
	if err != nil {
		log.Error("[processIrcMsg]failed to unmarshal json = " + err.Error())
		return
	}

	if ircMsg.Data == nil {
		log.Error("[processIrcMsg]nil data")
		return
	}

	switch ircMsg.Event {
	case "ircJoin":
		log.Debug("ircJoin = " + ircMsg.getData("channel"))
		channel := ircMsg.getData("channel")
		client.client.Join(channel)
	case "ircPrivMsg":
		target := ircMsg.getData("target")
		message := ircMsg.getData("message")
		//send message
		client.client.Privmsg(target, message)
		//save message
		timestamp := time.Now().Unix()
		insertMsgHistory(client.userId, target, client.nick, message, timestamp, true)
	case "ircBoxInfo":
		info := client.dumpInfo()
		EndpointPublishId(client.userId, info)
	case "ircNames":
		client.client.Names(ircMsg.getData("channel"))
	default:
		log.Debug("Unknown command:" + ircMsg.Event)
	}
}

//ircController goroutine handle all message to/from irc client
func (c *IRCClient) Loop(info *ClientContext) {
	for {
		select {
		case in := <-c.inChan:
			go c.processIrcMsg(in)
		case evt := <-c.evtChan:
			go c.handleIrcEvent(&evt)
		}
	}
}

var eventsToIgnore = map[string]bool{
	"250":  true, //RPL_STATSCONN
	"251":  true, //RPL_LUSERCLIENT
	"252":  true, //RPL_LUSEROP
	"253":  true, //RPL_LUSERUNKNOWN
	"254":  true, //RPL_LUSERCHANNELS
	"255":  true, //RPL_LUSERME
	"265":  true, //RPL_LOCALUSERS
	"266":  true, //RPL_GLOBALUSER
	"PING": true,
	"PONG": true,
	"MODE": true,
}

var eventsToForward = map[string]bool{
	"002":    true,
	"003":    true,
	"004":    true,
	"005":    true,
	"372":    true, //RPL_MOTD
	"375":    true, //RPL_MOTDSTART
	"376":    true, //RPL_ENDOFMOTD
	"NOTICE": true,
	"PART":   true,
	"QUIT":   true,
}

func (c *IRCClient) handleIrcEvent(evt *ogric.Event) {
	if eventsToIgnore[evt.Code] {
		return
	}

	if eventsToForward[evt.Code] {
		c.forwardEvent(evt)
		return
	}
	fnMap := map[string]func(*ogric.Event){
		"001":     c.process001,
		"PRIVMSG": c.processPrivMsg,
		"JOIN":    c.processJoined,
		"353":     c.processStartNames,
		"366":     c.processEndNames,
	}

	fn, ok := fnMap[evt.Code]
	if ok {
		fn(evt)
	} else {
		log.Info("Unhandled event = " + evt.Code)
	}
}

//forwardEvent sent an IRC event to all endpoints
func (c *IRCClient) forwardEvent(evt *ogric.Event) {
	data := make(map[string]interface{})
	data["message"] = evt.Message
	data["args"] = evt.Arguments
	data["nick"] = evt.Nick
	data["host"] = evt.Host
	data["source"] = evt.Source
	data["user"] = evt.User

	js, _ := simplejson.NewJson([]byte("{}"))
	js.Set("event", evt.Code)
	js.Set("data", data)

	jsStr, err := simpleJsonToString(js)
	if err != nil {
		return
	}

	EndpointPublishId(c.userId, jsStr)
}

//process PRIVMSG
func (c *IRCClient) processPrivMsg(e *ogric.Event) {
	target := e.Arguments[0]
	timestamp := time.Now().Unix()
	nick := e.Nick
	message := e.Message

	m := make(map[string]interface{})
	m["target"] = target
	m["nick"] = nick
	m["message"] = message
	m["timestamp"] = timestamp
	m["readFlag"] = false

	//save this message to DB
	oid := insertMsgHistory(c.userId, target, nick, message, timestamp, false)
	m["oid"] = oid

	//send this message to endpoint
	jsStr, err := jsonMarshal("ircPrivMsg", m)
	if err != nil {
		log.Error("[processPrivMsg]failed to marshal json:" + err.Error())
		return
	}
	EndpointPublishId(c.userId, jsStr)
}

//insertMsgHistory save a message to DB
func insertMsgHistory(userId, target, nick, message string, timestamp int64, readFlag bool) bson.ObjectId {
	objectId := bson.NewObjectId()
	go func() {
		toChannel := false
		if string(target[0]) == "#" {
			toChannel = true
		}
		doc := MessageHist{objectId, userId, target, nick, message, timestamp, readFlag, toChannel}
		err := DBInsert("ircboks", "msghist", &doc)
		if err != nil {
			log.Error("[insertMsgHistory] failed : " + err.Error())
		}
	}()
	return objectId
}

func (c *IRCClient) processStartNames(e *ogric.Event) {
	data := make(map[string]interface{})
	data["channel"] = e.Arguments[2]
	data["names"] = e.Message
	data["end"] = false

	js, _ := simplejson.NewJson([]byte("{}"))
	js.Set("event", "channelNames")
	js.Set("data", data)

	jsStr, err := simpleJsonToString(js)
	if err != nil {
		return
	}

	EndpointPublishId(c.userId, jsStr)
}

func (c *IRCClient) processEndNames(e *ogric.Event) {
	data := make(map[string]interface{})
	data["channel"] = e.Arguments[1]
	data["names"] = e.Message
	data["end"] = true

	js, _ := simplejson.NewJson([]byte("{}"))
	js.Set("event", "channelNames")
	js.Set("data", data)

	jsStr, err := simpleJsonToString(js)
	if err != nil {
		return
	}

	EndpointPublishId(c.userId, jsStr)
}

//process JOIN event
func (c *IRCClient) processJoined(e *ogric.Event) {
	channelName := e.Arguments[0]
	c.chanJoinedSet[channelName] = true
	c.forwardEvent(e)
}

/*
process001 will handle 001 (IRC connected event):
- new connection : forward this event to endpoint
- reconnect after disconnect : rejoin channel
*/
func (c *IRCClient) process001(e *ogric.Event) {
	c.forwardEvent(e)

	for chanName, _ := range c.chanJoinedSet {
		c.client.Join(chanName)
		delete(c.chanJoinedSet, chanName)
	}
}
