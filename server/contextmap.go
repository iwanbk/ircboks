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
func (c *contextMap) Get(userID string) (*ClientContext, bool) {
	c.RLock()
	ctx, found := c.ctxMap[userID]
	c.RUnlock()

	return ctx, found
}

//Del remove context of this userId
//return true if the context exist
func (c *contextMap) Del(userID string) bool {
	c.Lock()

	_, found := c.ctxMap[userID]

	if found {
		delete(c.ctxMap, userID)
	}

	c.Unlock()
	return found
}

//Add context
func (c *contextMap) Add(userID, nick, server, user string, inChan chan *EndptMsg, ws *websocket.Conn) *ClientContext {
	ctx := NewClientContext(userID, nick, server, user, inChan, ws)

	c.Lock()
	c.ctxMap[userID] = ctx
	c.Unlock()
	return ctx
}
