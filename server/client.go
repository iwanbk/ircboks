package main

import (
	"code.google.com/p/go.net/websocket"
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
	"332":    true, //RPL_TOPIC
	"333":    true, //RPL_TOPICWHOTIME
	"372":    true, //RPL_MOTD
	"375":    true, //RPL_MOTDSTART
	"376":    true, //RPL_ENDOFMOTD
	"NOTICE": true,
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

	return jsonMarshal("ircBoxInfo", data)
}

//processIrcMsg will unmarshal irc command json string and dispatch it to respective handler
func (c *IRCClient) processIrcMsg(em *EndptMsg) {
	//handler for IRC Command
	handlers := map[string]func(*EndptMsg){
		"join":    c.Join,
		"privmsg": c.PrivMsg,
		"part":    c.Part,
		"names":   c.Names,
		"nick":    c.Nick,
	}

	if fn, ok := handlers[em.Event]; ok {
		fn(em)
		return
	}

	switch em.Event {
	case "ircBoxInfo":
		info := c.dumpInfo()
		EndpointPublishID(em.UserID, info)

	case "killMe":
		c.client.Stop()
		go func() {
			c.stopChan <- true
		}()
	default:
		log.Error("processIrcMessage() unknown command :" + em.Event)
	}
}

//SetNick change nick of this client
func (c *IRCClient) Nick(em *EndptMsg) {
	if newNick, ok := em.GetDataString("new_nick"); ok {
		c.client.SetNick(newNick)
	} else {
		log.Error("SetNick() empty nick")
	}
}
func (c *IRCClient) Names(em *EndptMsg) {
	if channel, ok := em.GetDataString("channel"); ok {
		c.client.Names(channel)
	}
}

//PrivMsg send IRC PRIVMSG
func (c *IRCClient) PrivMsg(em *EndptMsg) {
	var target, message string
	var ok bool

	if target, ok = em.GetDataString("target"); !ok {
		return
	}
	if message, ok = em.GetDataString("message"); !ok {
		return
	}

	c.client.Privmsg(target, message)
	//save message
	timestamp := time.Now().Unix()
	MsgHistInsert(c.userID, target, c.nick, message, timestamp, true, false)
}

func (c *IRCClient) Join(em *EndptMsg) {
	if channel, ok := em.GetDataString("channel"); ok {
		c.client.Join(channel)
	}
}

//PART command
func (c *IRCClient) Part(em *EndptMsg) {
	if len(em.Args) == 0 {
		log.Error("part() invalid args len = 0")
		return
	}
	c.client.Part(em.Args[0], "")
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
		"PART":    c.processPart,
		"353":     c.processStartNames,
		"366":     c.processEndNames,
		"NICK":    c.processNick,
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
	data["raw"] = evt.Raw

	EndpointPublishID(c.userID, jsonMarshal(evt.Code, data))
}

//processNick handle NICK event
func (c *IRCClient) processNick(e *ogric.Event) {
	if e.Nick == c.nick {
		c.nick = e.Message
	}
	c.forwardEvent(e)
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
	EndpointPublishID(c.userID, jsonMarshal("ircPrivMsg", m))
}

func (c *IRCClient) processStartNames(e *ogric.Event) {
	data := make(map[string]interface{})
	data["channel"] = e.Arguments[2]
	data["names"] = e.Message
	data["end"] = false

	EndpointPublishID(c.userID, jsonMarshal("channelNames", data))
}

func (c *IRCClient) processEndNames(e *ogric.Event) {
	data := make(map[string]interface{})
	data["channel"] = e.Arguments[1]
	data["names"] = e.Message
	data["end"] = true

	EndpointPublishID(c.userID, jsonMarshal("channelNames", data))
}

//process JOIN event
func (c *IRCClient) processJoined(e *ogric.Event) {
	if len(e.Arguments) == 0 {
		log.Error("processJoined() invalid event args len = 0")
	} else {
		log.Debug("process join nick=" + e.Nick)
		channelName := e.Arguments[0]
		c.chanJoinedSet[channelName] = true
	}
	c.forwardEvent(e)
}

//process PART
func (c *IRCClient) processPart(e *ogric.Event) {
	if len(e.Arguments) == 0 {
		log.Error("processPart() invalid event args len = 0")
	} else if e.Nick == c.nick {
		channelName := e.Arguments[0]
		c.chanJoinedSet[channelName] = true
		if _, exist := c.chanJoinedSet[channelName]; exist {
			delete(c.chanJoinedSet, channelName)
		}
	}
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

func onClientCreateInvalidArgument(ws *websocket.Conn) {
	data := map[string]interface{}{
		"result": false,
		"reason": "invalidArgument",
	}

	websocket.Message.Send(ws, jsonMarshal("clientStartResult", data))
}

//ClientCreate create ircboks IRC client and start it
func ClientCreate(em *EndptMsg, ws *websocket.Conn) {
	var resp, nick, server, user, password string
	var ok bool

	if nick, ok = em.GetDataString("nick"); !ok {
		onClientCreateInvalidArgument(ws)
		return
	}
	if server, ok = em.GetDataString("server"); !ok {
		onClientCreateInvalidArgument(ws)
		return
	}
	if user, ok = em.GetDataString("user"); !ok {
		onClientCreateInvalidArgument(ws)
		return
	}

	//password is not mandatory, we can accept empty password
	password, _ = em.GetDataString("password")

	if err := clientStart(em.UserID, nick, password, user, server, ws); err != nil {
		resp = jsonMarshal("clientStartResult", map[string]interface{}{"result": false})
	} else {
		resp = jsonMarshal("clientStartResult", map[string]interface{}{"result": true})
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
