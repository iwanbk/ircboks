package main

import (
	"code.google.com/p/go.net/websocket"
	"sync"
)

type contextMap struct {
	sync.RWMutex
	ctxMap map[string]*ClientContext
}

//map of all client context
var ContextMap *contextMap

//ContextMapInit initialize this module
func ContextMapInit() {
	ContextMap = new(contextMap)
	ContextMap.ctxMap = make(map[string]*ClientContext)
}

//Get retrieve context of this userId.
//return the context or nil and bool value indicating whether the context was found
func (c *contextMap) Get(userId string) (*ClientContext, bool) {
	c.RLock()
	ctx, found := c.ctxMap[userId]
	c.RUnlock()

	return ctx, found
}

//Del remove context of this userId
//return true if the context exist
func (c *contextMap) Del(userId string) bool {
	c.Lock()

	_, found := c.ctxMap[userId]

	if found {
		delete(c.ctxMap, userId)
	}

	c.Unlock()
	return found
}

//Add context
func (c *contextMap) Add(userId, nick, server, user string, inChan chan string, ws *websocket.Conn) *ClientContext {
	ctx := NewClientContext(userId, nick, server, user, inChan, ws)

	c.Lock()
	c.ctxMap[userId] = ctx
	c.Unlock()
	return ctx
}
