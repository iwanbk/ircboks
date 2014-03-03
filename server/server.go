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
			handleBoxMsg(wsCtx, wsMsg)
		}
	}

	if wsCtx.LoggedIn {
		UserLogout(wsCtx.UserID, ws)
	}
	log.Debug("[wsMain]endpoint exited")
}

//handle IRCBoks message
func handleBoxMsg(wsCtx *wsContext, em *EndptMsg) {
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

	switch em.Event {
	case "clientStart":
		resp, _ = handleClientStart(em, wsCtx.Ws)
		websocket.Message.Send(wsCtx.Ws, resp)
	case "msghistChannel":
		go MsgHistChannel(em, wsCtx.Ws)
	case "msghistNickReq":
		go MsgHistNick(em, wsCtx.Ws)
	case "msghistMarkRead":
		go MsgHistMarkRead(em)
	case "msghistNicksUnread":
		go MsgHistNicksUnread(em, wsCtx.Ws)
	default:
		log.Error("Unhandled event = " + em.Event)
	}
}

//handle userStart command from browser
func handleClientStart(em *EndptMsg, ws *websocket.Conn) (string, error) {
	nick, _ := em.GetDataString("nick")
	server, _ := em.GetDataString("server")
	user, _ := em.GetDataString("user")
	password, _ := em.GetDataString("password")
	userID := em.UserID
	//check parameter
	if len(nick) == 0 || len(server) == 0 || len(user) == 0 {
		log.Error("empty clientId / nick / server / username")
		return `{"event":"clientStartResult", "data":{"result":"false", "reason":"invalidArgument"}}`, nil
	}
	IrcStart(userID, nick, password, user, server, ws)

	return `{"event":"clientStartResult", "data":{"result":"true"}}`, nil
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
