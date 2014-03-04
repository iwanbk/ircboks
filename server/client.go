package main

import (
	"code.google.com/p/go.net/websocket"
	simplejson "github.com/bitly/go-simplejson"
	"github.com/iwanbk/ogric"
	log "github.com/ngmoco/timber"
	"time"
)

//IRCClient represents an IRCBoks IRC client
type IRCClient struct {
	userID   string
	nick     string
	password string
	user     string
	server   string

	client *ogric.Ogric

	//event channel
	evtChan chan ogric.Event

	//input channel
	inChan chan *EndptMsg

	stopChan chan bool
	//channel  joined
	chanJoinedSet map[string]bool
}

//IRC events that will be ignored
//We dont really need these. We put it here for clarity
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

//IRC events that will be forwarded to user without any processing
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

//NewIRCClient construct a new IRC client
func NewIRCClient(userID, nick, password, user, server string, inChan chan *EndptMsg) (*IRCClient, error) {
	c := new(IRCClient)
	c.userID = userID
	c.nick = nick
	c.password = password
	c.user = user
	c.server = server
	c.inChan = inChan
	c.stopChan = make(chan bool)

	c.client = ogric.NewOgric(nick, user, server)
	c.client.Password = password

	c.chanJoinedSet = make(map[string]bool)

	return c, nil
}

//Start start ircboks irc client and return error if any
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

//processIrcMsg will unmarshal irc command json string and dispatch it to respective handler
func (c *IRCClient) processIrcMsg(em *EndptMsg) {
	switch em.Event {
	case "ircJoin":
		if channel, ok := em.GetDataString("channel"); ok {
			c.client.Join(channel)
		}
	case "ircPrivMsg":
		target, _ := em.GetDataString("target")
		message, _ := em.GetDataString("message")
		if len(target) == 0 && len(message) == 0 {
			return
		}
		c.client.Privmsg(target, message)
		//save message
		timestamp := time.Now().Unix()
		MsgHistInsert(c.userID, target, c.nick, message, timestamp, true, false)
	case "ircBoxInfo":
		info := c.dumpInfo()
		EndpointPublishID(em.UserID, info)
	case "ircNames":
		if channel, ok := em.GetDataString("channel"); ok {
			c.client.Names(channel)
		}
	case "killMe":
		c.client.Stop()
		go func() {
			c.stopChan <- true
		}()
	default:
		log.Debug("Unknown command:" + em.Event)
	}
}

//Loop handle all messages to/from irc client
func (c *IRCClient) Loop(info *ClientContext) {
	stopped := false
	for !stopped {
		select {
		case in := <-c.inChan:
			go c.processIrcMsg(in)
		case evt := <-c.evtChan:
			go c.handleIrcEvent(&evt)
		case <-c.stopChan:
			stopped = true
		}
	}
	log.Info("IRCClient.Loop for " + c.userID + " exited")
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
		log.Info("handleIrcEvent() unhandled event = " + evt.Code)
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

	EndpointPublishID(c.userID, jsStr)
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
	oid := MsgHistInsert(c.userID, target, nick, message, timestamp, false, true)
	m["oid"] = oid

	//send this message to endpoint
	jsStr, err := jsonMarshal("ircPrivMsg", m)
	if err != nil {
		log.Error("[processPrivMsg]failed to marshal json:" + err.Error())
		return
	}
	EndpointPublishID(c.userID, jsStr)
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

	EndpointPublishID(c.userID, jsStr)
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

	EndpointPublishID(c.userID, jsStr)
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

	for chanName := range c.chanJoinedSet {
		c.client.Join(chanName)
		delete(c.chanJoinedSet, chanName)
	}
}

//ClientCreate create ircboks IRC client and start it
func ClientCreate(em *EndptMsg, ws *websocket.Conn) {
	var resp string
	nick, _ := em.GetDataString("nick")
	server, _ := em.GetDataString("server")
	user, _ := em.GetDataString("user")
	password, _ := em.GetDataString("password")
	userID := em.UserID
	//check parameter
	if len(nick) == 0 || len(server) == 0 || len(user) == 0 {
		log.Error("empty clientId / nick / server / username")
		resp = `{"event":"clientStartResult", "data":{"result":"false", "reason":"invalidArgument"}}`
		websocket.Message.Send(ws, resp)
		return
	}

	if err := clientStart(userID, nick, password, user, server, ws); err != nil {
		resp = `{"event":"clientStartResult", "data":{"result":"false"}}`
	} else {
		resp = `{"event":"clientStartResult", "data":{"result":"true"}}`
	}
	websocket.Message.Send(ws, resp)
}

func clientStart(userID, nick, password, username, server string, ws *websocket.Conn) error {
	log.Debug("clientStart(). userId=" + userID + ". Nick = " + nick + ". Username = " + username + ". Server = " + server)

	//create IRC client
	inChan := make(chan *EndptMsg)
	client, err := NewIRCClient(userID, nick, password, username, server, inChan)
	if err != nil {
		return err
	}

	//start IRC client
	if err = client.Start(); err != nil {
		return err
	}

	//add client context
	ctx := ContextMap.Add(userID, nick, server, username, inChan, ws)

	//start client loop
	go client.Loop(ctx)

	return nil
}

//ClientDoIRCCmd receive IRC command and run it
func ClientDoIRCCmd(em *EndptMsg, ws *websocket.Conn) {
	ctx, found := ContextMap.Get(em.UserID)
	if !found {
		log.Error("Can't find client ctx for userId = " + em.UserID)
		return
	}
	ctx.InChan <- em
}

//ClientDestroy kill the client
func ClientDestroy(em *EndptMsg, ws *websocket.Conn) {
	ctx, found := ContextMap.Get(em.UserID)
	if !found {
		log.Error("Can't find client ctx for userId = " + em.UserID)
		return
	}
	ctx.InChan <- em

	ContextMap.Del(em.UserID)

	em = &EndptMsg{"ircClientDestroyed", "", "", nil, nil, ""}
	jsonStr, err := em.MarshalJson()
	if err != nil {
		log.Error("ClientDestroy()failed to marshal json = " + err.Error())
	}
	websocket.Message.Send(ws, jsonStr)
}
