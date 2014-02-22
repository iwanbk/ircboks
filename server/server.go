// server.go
package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	log "github.com/ngmoco/timber"
	"github.com/stathat/jconfig"
	"net/http"
)

//WsMessage is websocket message from browser
type WsMessage struct {
	Event string `json="event"`
}

type WsContext struct {
	UserId   string
	LoggedIn bool
	Ws       *websocket.Conn
}

func NewWSContext(ws *websocket.Conn) *WsContext {
	w := new(WsContext)
	w.Ws = ws
	w.LoggedIn = false
	return w
}

var Config = jconfig.LoadConfig("config.json")

func main() {
	log.LoadConfiguration("timber.xml")
	r := mux.NewRouter()
	r.Handle("/irc/", websocket.Handler(wsMain))

	log.Debug("Starting ircbox server ..")
	InitClientContextMap()
	go EndpointPublisher()

	err := http.ListenAndServe(Config.GetString("host_port"), r)

	if err != nil {
		fmt.Println("ListenAndServer error : ", err.Error())
	}
}

//websocket main handler
func wsMain(ws *websocket.Conn) {
	defer ws.Close()

	wsCtx := NewWSContext(ws)

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
		wsMsg := WsMessage{}

		err = json.Unmarshal([]byte(msg), &wsMsg)
		if err != nil {
			log.Error("[wsMain]failed to unmarshal json.Ignore it")
			continue
		}

		if isIrcMsg(wsMsg.Event) && wsCtx.LoggedIn {
			handleIrcMsg(msg, wsCtx.UserId, ws)
		} else {
			handleBoxMsg(wsCtx, wsMsg.Event, msg)
		}
	}

	if wsCtx.LoggedIn {
		UserLogout(wsCtx.UserId, ws)
	}
	log.Debug("[wsMain]endpoint exited")
}

//handle IRCBoks message
func handleBoxMsg(wsCtx *WsContext, event, msg string) {
	resp := "{}"
	if event == "login" {
		userId, resp, isLoginOK, _ := UserLogin(msg, wsCtx.Ws)
		wsCtx.UserId = userId
		wsCtx.LoggedIn = isLoginOK
		websocket.Message.Send(wsCtx.Ws, resp)
		return
	} else if event == "userRegister" {
		UserRegister(msg, wsCtx.Ws)
		return
	}

	if !wsCtx.LoggedIn {
		resp = `{"event":"illegalAccess", "data":{"reason":"needLogin"}}`
		websocket.Message.Send(wsCtx.Ws, resp)
	}

	switch event {
	case "clientStart":
		resp, _ = handleClientStart(msg, wsCtx.Ws)
		websocket.Message.Send(wsCtx.Ws, resp)
	case "msghistChannel":
		go MsgHistChannel(msg, wsCtx.Ws)
	case "msghistNickReq":
		go MsgHistNick(msg, wsCtx.Ws)
	case "msghistMarkRead":
		go MsgHistMarkRead(msg)
	default:
		log.Error("Unhandled event = " + event)
	}
}

//handle userStart command from browser
func handleClientStart(msgStr string, ws *websocket.Conn) (string, error) {
	msg := IrcStartMsg{}
	err := json.Unmarshal([]byte(msgStr), &msg)
	if err != nil {
		log.Error("[handleIrcStart]failed to unmarshal = " + err.Error())
		return "", err
	}
	//check parameter
	if len(msg.Data.UserId) == 0 || len(msg.Data.Nick) == 0 || len(msg.Data.Server) == 0 || len(msg.Data.User) == 0 {
		log.Error("empty clientId / nick / server / username")
		return `{"event":"clientStartResult", "data":{"result":"false", "reason":"invalidArgument"}}`, nil
	}
	IrcStart(msg.Data.UserId, msg.Data.Nick, msg.Data.Password, msg.Data.User, msg.Data.Server, ws)

	return `{"event":"clientStartResult", "data":{"result":"true"}}`, nil
}

//check if a message is an IRC command message
func isIrcMsg(msg string) bool {
	return msg[:3] == "irc"
}

//handle IRC command
func handleIrcMsg(msg, userId string, ws *websocket.Conn) error {
	ctx, err := GetClientContext(userId)

	if err != nil {
		log.Error("Error when getting map info for = " + userId)
		return err
	}

	if ctx == nil {
		log.Error("[handleIrcMsg] userContext for '" + userId + "' is nil")
		return nil
	}

	ctx.InChan <- msg
	return nil
}
