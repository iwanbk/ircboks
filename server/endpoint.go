package main

import (
	"code.google.com/p/go.net/websocket"
	log "github.com/ngmoco/timber"
)

type endpointMsg struct {
	Msg       string
	UserID    string
	ClientCtx *ClientContext
}

var endpointMsgChan = make(chan *endpointMsg, 10)

//EndpointPublisher is
func EndpointPublisher() {
	for {
		msg := <-endpointMsgChan
		if msg.ClientCtx == nil {
			ctx, found := ContextMap.Get(msg.UserID)
			if !found {
				log.Error("[EndpointWriter] failed to find context for :" + msg.UserID)
				continue
			}
			msg.ClientCtx = ctx
		}

		for _, ws := range msg.ClientCtx.wsArr {
			websocket.Message.Send(ws, msg.Msg)
		}
	}
}

//EndpointPublishCtx publish message to all endpoint with same context
func EndpointPublishCtx(ctx *ClientContext, msg string) {
	m := new(endpointMsg)
	m.Msg = msg
	m.ClientCtx = ctx
	endpointMsgChan <- m
}

//EndpointPublishID publish message to all endpoint of a userID
func EndpointPublishID(userID string, msg string) {
	m := new(endpointMsg)
	m.Msg = msg
	m.UserID = userID
	endpointMsgChan <- m
}

//EndpointSend send message to an endpoint
func EndpointSend(ws *websocket.Conn, msg string) {
	go websocket.Message.Send(ws, msg)
}
