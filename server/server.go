// server.go
package main

import (
	"code.google.com/p/go.net/websocket"
	"github.com/gorilla/mux"
	log "github.com/ngmoco/timber"
	"github.com/stathat/jconfig"
	"net/http"
)

//wsContenxt represent a websocket connection context
type wsContext struct {
	UserID   string          //user id
	LoggedIn bool            //login status. true if logged in
	Ws       *websocket.Conn //websocket object
}

//construct new websocket context
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
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../ui/build/")))

	ContextMapInit()
	go EndpointPublisher()

	log.Debug("Starting ircboks server ..")

	if err := http.ListenAndServe(Config.GetString("host_port"), r); err != nil {
		log.Error("ListenAndServer error :", err.Error())
	}
	log.Close()
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
			ClientDoIRCCmd(wsMsg, ws)
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
	"killMe":             ClientDestroy,
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
		em := EndptMsg{
			Event: "illegalAccess",
			Data: map[string]interface{}{
				"reason": "needLogin",
			},
		}
		websocket.Message.Send(wsCtx.Ws, em.Marshal())
	}

	if fn, ok := boksHandlers[em.Event]; ok {
		go fn(em, wsCtx.Ws)
	} else {
		log.Error("dispatchBoksHandler() unhandled event:" + em.Event)
	}
}
