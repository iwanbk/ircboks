package main

import (
	"code.google.com/p/go.net/websocket"
	log "github.com/ngmoco/timber"
)

//ClientContext hold any related data about an IRC client
type ClientContext struct {
	UserId string
	//irc detail
	Nick   string
	Server string
	User   string
	//input channel
	InChan chan *EndptMsg

	wsArr []*websocket.Conn
}

func NewClientContext(userId, nick, server, user string, inChan chan *EndptMsg, ws *websocket.Conn) *ClientContext {
	return &ClientContext{userId, nick, server, user, inChan, []*websocket.Conn{ws}}
}

func (c *ClientContext) AddWs(ws *websocket.Conn) {
	c.wsArr = append(c.wsArr, ws)
}

func (c *ClientContext) DelWs(ws *websocket.Conn) {
	//search index
	idx := -1
	for i, v := range c.wsArr {
		if v == ws {
			idx = i
			break
		}
	}
	//del if ws found
	if idx != -1 {
		log.Debug("deleting ws for = " + c.UserId)
		if len(c.wsArr) == 1 {
			c.wsArr = []*websocket.Conn{}
		} else {
			c.wsArr[idx] = c.wsArr[len(c.wsArr)-1]
			c.wsArr = c.wsArr[:len(c.wsArr)-1]
		}
	}
}
