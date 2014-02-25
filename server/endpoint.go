package main

import (
	"code.google.com/p/go.net/websocket"
	log "github.com/ngmoco/timber"
)

type EndpointMsg struct {
	Msg       string
	UserId    string
	ClientCtx *ClientContext
}

var EndpointMsgChan = make(chan *EndpointMsg, 10)

//EndpointWriter write message to all endpoint
func EndpointPublisher() {
	for {
		msg := <-EndpointMsgChan
		if msg.ClientCtx == nil {
			ctx := ClientContextGet(msg.UserId)
			if ctx == nil {
				log.Error("[EndpointWriter] failed to find context for :" + msg.UserId)
				continue
			}
			msg.ClientCtx = ctx
		}

		for _, ws := range msg.ClientCtx.wsArr {
			websocket.Message.Send(ws, msg.Msg)
		}
	}
}

func EndpointPublishCtx(ctx *ClientContext, msg string) {
	m := new(EndpointMsg)
	m.Msg = msg
	m.ClientCtx = ctx
	EndpointMsgChan <- m
}

func EndpointPublishId(userId string, msg string) {
	m := new(EndpointMsg)
	m.Msg = msg
	m.UserId = userId
	EndpointMsgChan <- m
}

func EndpointSend(ws *websocket.Conn, msg string) {
	go websocket.Message.Send(ws, msg)
}
