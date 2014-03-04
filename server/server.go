// server.go
package main

import (
	"code.google.com/p/go.net/websocket"
	"fmt"
	"github.com/gorilla/mux"
	log "github.com/ngmoco/timber"
	"github.com/stathat/jconfig"
	"net/http"
)

type wsContext struct {
	UserID   string
	LoggedIn bool
	Ws       *websocket.Conn
}

func newWSContext(ws *websocket.Conn) *wsContext {
	w := new(wsContext)
	w.Ws = ws
	w.LoggedIn = false
	return w
}

//Config is this application configuration
var Config = jconfig.LoadConfig("config.json")

func main() {
	log.LoadConfiguration("timber.xml")
	r := mux.NewRouter()
	r.Handle("/irc/", websocket.Handler(wsMain))

	log.Debug("Starting ircbox server ..")
	ContextMapInit()
	go EndpointPublisher()

	err := http.ListenAndServe(Config.GetString("host_port"), r)

	if err != nil {
		fmt.Println("ListenAndServer error : ", err.Error())
	}
}

//websocket main handler
func wsMain(ws *websocket.Conn) {
	defer ws.Close()

	wsCtx := newWSContext(ws)

	var msg string
	for {
		//read message
		err := websocket.Message.Receive(ws, &msg)
		if err != nil {
			log.Info("[wsMain]websocket read failed : " + err.Error())
			break
		}
		log.Debug("[wsMain]endpoint's msg = " + msg)

		//parse message
		wsMsg, err := NewEndptMsgFromStr(msg)

		if err != nil {
			log.Error("[wsMain]failed to unmarshal json :" + err.Error())
			continue
		}
		wsCtx.UserID = wsMsg.UserID

		if wsMsg.Domain == "irc" && wsCtx.LoggedIn {
			handleIrcMsg(wsMsg, ws)
		} else {
			dispatchBoksHandler(wsCtx, wsMsg)
		}
	}

	if wsCtx.LoggedIn {
		UserLogout(wsCtx.UserID, ws)
	}
	log.Debug("[wsMain]endpoint exited")
}

var boksHandlers = map[string]func(*EndptMsg, *websocket.Conn){
	"clientStart":        ClientCreate,
	"msghistChannel":     MsgHistChannel,
	"msghistNickReq":     MsgHistNick,
	"msghistMarkRead":    MsgHistMarkRead,
	"msghistNicksUnread": MsgHistNicksUnread,
}

//handle IRCBoks message
func dispatchBoksHandler(wsCtx *wsContext, em *EndptMsg) {
	resp := "{}"
	if em.Event == "login" {
		resp, isLoginOK, _ := UserLogin(em, wsCtx.Ws)
		wsCtx.LoggedIn = isLoginOK
		websocket.Message.Send(wsCtx.Ws, resp)
		return
	} else if em.Event == "userRegister" {
		UserRegister(em, wsCtx.Ws)
		return
	}

	if !wsCtx.LoggedIn {
		resp = `{"event":"illegalAccess", "data":{"reason":"needLogin"}}`
		websocket.Message.Send(wsCtx.Ws, resp)
	}

	if fn, ok := boksHandlers[em.Event]; ok {
		go fn(em, wsCtx.Ws)
	} else {
		log.Error("dispatchBoksHandler() unhandled event:" + em.Event)
	}
}

//handle IRC command
func handleIrcMsg(em *EndptMsg, ws *websocket.Conn) {
	ctx, found := ContextMap.Get(em.UserID)
	if !found {
		log.Error("Can't find client ctx for userId = " + em.UserID)
		return
	}
	ctx.InChan <- em
}
